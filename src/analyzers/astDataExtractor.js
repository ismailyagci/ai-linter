const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const globals = require('./globals');

const consoleMethods = new Set(['log', 'warn', 'error', 'info', 'debug', 'table', 'dir', 'assert', 'count', 'time', 'timeEnd', 'trace']);

function isGlobalOrCommonBuiltIn(name) {
  return globals.has(name);
}

class AstDataExtractor {
  extractData(code, filePath, fileExtension) {
    try {
      const plugins = ['jsx', 'dynamicImport', 'decorators-legacy'];
      if (['.ts', '.tsx'].includes(fileExtension)) {
        plugins.push('typescript');
      }

      let ast;
      if (fileExtension === '.vue') {
        const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        if (!scriptMatch) {
          return { syntaxError: null, imports: [], dynamicImports: [], exports: [], unusedImports: [], codeIssues: [], comments: [] };
        }
        const scriptCode = scriptMatch[1];
        ast = parser.parse(scriptCode, {
          sourceType: 'module',
          plugins: ['jsx', 'dynamicImport', 'typescript'],
          attachComment: true
        });
      } else {
        ast = parser.parse(code, {
          sourceType: 'unambiguous',
          plugins,
          attachComment: true
        });
      }
      return this._traverseAst(ast, filePath);
    } catch (error) {
      return {
        syntaxError: {
          message: error.message,
          line: error.loc?.line,
          column: error.loc?.column
        },
        imports: [],
        dynamicImports: [],
        exports: [],
        unusedImports: [],
        codeIssues: [],
        comments: []
      };
    }
  }

  _traverseAst(ast, filePath) {
    const imports = [];
    const dynamicImports = [];
    const exports = [];
    const unusedImports = [];
    const importedIdentifiers = new Set();
    const usedIdentifiers = new Set();
    const codeIssues = [];
    const comments = [];

    traverse(ast, {
      ImportDeclaration({ node }) {
        const importPath = node.source.value;
        const specifiers = node.specifiers.map(spec => {
          let name, alias;
          if (spec.type === 'ImportDefaultSpecifier') {
            name = 'default';
            alias = spec.local.name;
          } else if (spec.type === 'ImportNamespaceSpecifier') {
            name = '*';
            alias = spec.local.name;
          } else {
            name = spec.imported.name;
            alias = spec.local.name;
          }
          importedIdentifiers.add(alias);
          return { name, alias, type: spec.type };
        });
        imports.push({
          path: importPath,
          specifiers,
          line: node.loc?.start.line
        });
      },
      CallExpression({ node }) {
        if (node.callee.name === 'require' &&
            node.arguments.length === 1 &&
            node.arguments[0].type === 'StringLiteral') {
          imports.push({
            path: node.arguments[0].value,
            specifiers: [{ name: 'default', alias: null, type: 'require' }],
            line: node.loc?.start.line,
            isDynamic: false
          });
        }
        if (node.callee.type === 'Import' &&
            node.arguments.length === 1 &&
            node.arguments[0].type === 'StringLiteral') {
          dynamicImports.push({
            path: node.arguments[0].value,
            line: node.loc?.start.line
          });
        }
        if (node.callee.name === 'eval') {
          codeIssues.push({
            type: 'eval-usage',
            message: "Usage of 'eval' is discouraged.",
            line: node.loc?.start.line
          });
        }
        if (node.callee.type === 'MemberExpression' && 
            node.callee.object.name === 'console' && 
            node.callee.property.name && 
            consoleMethods.has(node.callee.property.name)) {
          codeIssues.push({
            type: 'console-usage',
            message: `Usage of 'console.${node.callee.property.name}'.`,
            line: node.loc?.start.line,
            identifierName: `console.${node.callee.property.name}`
          });
        }
      },
      ExportNamedDeclaration({ node }) {
        if (node.source) {
          exports.push({
            type: 're-export',
            from: node.source.value,
            specifiers: node.specifiers.map(spec => ({ localName: spec.local.name, exportedName: spec.exported.name })),
            line: node.loc?.start.line
          });
        } else if (node.declaration) {
          const declarationNames = [];
          if (node.declaration.type === 'VariableDeclaration') {
            node.declaration.declarations.forEach(declarator => {
              if (declarator.id.type === 'Identifier') {
                declarationNames.push(declarator.id.name);
              }
            });
          } else if (node.declaration.id && node.declaration.id.name) {
            declarationNames.push(node.declaration.id.name);
          }
          if (declarationNames.length > 0) {
            exports.push({
              type: 'named',
              specifiers: declarationNames,
              line: node.loc?.start.line
            });
          }
        } else if (node.specifiers && node.specifiers.length > 0) {
          exports.push({
            type: 'named',
            specifiers: node.specifiers.map(spec => spec.exported.name),
            line: node.loc?.start.line
          });
        }
      },
      ExportDefaultDeclaration({ node }) {
        exports.push({ type: 'default', line: node.loc?.start.line });
      },
      ExportAllDeclaration({ node }) {
        exports.push({
          type: 'all',
          from: node.source.value,
          line: node.loc?.start.line
        });
      },
      Identifier(path) {
        const { node } = path;
        if (importedIdentifiers.has(node.name)) {
          usedIdentifiers.add(node.name);
        }

        if (path.isReferencedIdentifier()) {
          const parentType = path.parentPath.node.type;
          const isPropertyAccess = (parentType === 'MemberExpression' || parentType === 'OptionalMemberExpression') && path.key === 'property' && !path.parentPath.node.computed;
          const isObjectOrClassKey = (path.key === 'key' && !path.parentPath.node.computed &&
                                    (parentType === 'ObjectProperty' || parentType === 'ClassProperty' || parentType === 'MethodDefinition'));
          const isLabel = parentType === 'LabeledStatement' || parentType === 'BreakStatement' || parentType === 'ContinueStatement';
          const isImportedSpecifierName = parentType === 'ImportSpecifier' && path.key === 'imported';

          if (isPropertyAccess || isObjectOrClassKey || isLabel || isImportedSpecifierName) {
            
          } else if (!path.scope.hasBinding(node.name) && !isGlobalOrCommonBuiltIn(node.name)) {
            codeIssues.push({
              type: 'undeclared-identifier',
              message: `Identifier '${node.name}' is not declared.`,
              line: node.loc?.start.line,
              identifierName: node.name
            });
          }
        }
      },
      JSXOpeningElement(path) {
        const { node } = path;
        if (node.name.type === 'JSXIdentifier') {
          const componentName = node.name.name;
          if (componentName[0] === componentName[0].toUpperCase() && !(componentName[0] >= '0' && componentName[0] <= '9')) {
            if (!path.scope.hasBinding(componentName) && !importedIdentifiers.has(componentName) && !isGlobalOrCommonBuiltIn(componentName)) {
              codeIssues.push({
                type: 'undeclared-jsx-component',
                message: `JSX component '<${componentName}>' is not declared or imported.`,
                line: node.loc?.start.line,
                identifierName: componentName
              });
            }
          }
        }
      },
      DebuggerStatement({ node }) {
        codeIssues.push({
          type: 'debugger-statement',
          message: "'debugger' statement found.",
          line: node.loc?.start.line
        });
      },
      ObjectExpression(path) {
        const { node } = path;
        const seenKeys = new Set();
        for (const prop of node.properties) {
          if (prop.type === 'ObjectProperty' && !prop.computed) {
            let keyName;
            if (prop.key.type === 'Identifier') {
              keyName = prop.key.name;
            } else if (prop.key.type === 'StringLiteral' || prop.key.type === 'NumericLiteral') {
              keyName = String(prop.key.value);
            }

            if (keyName !== undefined) {
              if (seenKeys.has(keyName)) {
                codeIssues.push({
                  type: 'duplicate-object-key',
                  message: `Duplicate key '${keyName}' in object literal.`,
                  line: prop.key.loc?.start.line,
                  identifierName: keyName
                });
              } else {
                seenKeys.add(keyName);
              }
            }
          }
        }
      },
      enter(path) {
        if (path.node.leadingComments || path.node.trailingComments || path.node.innerComments) {
          const nodeComments = [
            ...(path.node.leadingComments || []),
            ...(path.node.trailingComments || []),
            ...(path.node.innerComments || [])
          ];
          nodeComments.forEach(comment => {
            const commentText = comment.value.trim().toUpperCase();
            if (commentText.startsWith('TODO') || commentText.startsWith('FIXME')) {
              comments.push({
                type: commentText.startsWith('TODO') ? 'todo' : 'fixme',
                text: comment.value.trim(),
                line: comment.loc.start.line,
                column: comment.loc.start.column
              });
            }
          });
        }
      }
    });

    for (const identifier of importedIdentifiers) {
      if (!usedIdentifiers.has(identifier)) {
        unusedImports.push(identifier);
      }
    }
    return {
      syntaxError: null,
      imports,
      dynamicImports,
      exports,
      unusedImports,
      codeIssues,
      comments
    };
  }
}

module.exports = AstDataExtractor;
