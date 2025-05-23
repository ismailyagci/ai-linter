const path = require('path');

class ExportValidator {
  constructor(fileParser, aliasResolver) {
    this.fileParser = fileParser;
    this.aliasResolver = aliasResolver;
  }

  validateNamedImports(importStatement, availableExports, importedFilePath) {
    const issues = [];
    if (!importStatement.specifiers || importStatement.specifiers.length === 0 || !availableExports) {
      return issues;
    }

    const exportNames = new Set();
    let hasExportAll = false;
    let hasDefaultExport = false;

    availableExports.forEach(exp => {
      if (exp.type === 'named' && exp.specifiers) {
        exp.specifiers.forEach(specName => exportNames.add(specName));
      } else if (exp.type === 'default') {
        hasDefaultExport = true;
        exportNames.add('default');
      } else if (exp.type === 're-export' && exp.specifiers) {
        exp.specifiers.forEach(spec => exportNames.add(spec.exportedName));
      } else if (exp.type === 'all' && exp.from) {
        hasExportAll = true;
      }
    });

    importStatement.specifiers.forEach(spec => {
      if (spec.type === 'ImportSpecifier') {
        if (!exportNames.has(spec.name) && !hasExportAll) {
          issues.push({
            type: 'unresolved-named-import',
            message: `Named import '${spec.name}' not found in '${path.basename(importedFilePath)}'.`,
            line: importStatement.line,
            importName: spec.name
          });
        }
      } else if (spec.type === 'ImportDefaultSpecifier') {
        if (!hasDefaultExport && !exportNames.has('default') && !hasExportAll) {
          issues.push({
            type: 'unresolved-default-import',
            message: `Default import not found in '${path.basename(importedFilePath)}'.`,
            line: importStatement.line
          });
        }
      }
    });
    return issues;
  }

  validateReExports(exports, baseDir, issues) {
    for (const exp of exports) {
      if (exp.type === 're-export' && exp.from) {
        let reExportedPathString;
        try {
          reExportedPathString = this.aliasResolver.resolveImportPath(exp.from, baseDir);
        } catch (error) {
          issues.push({
            type: 'unresolved-re-export-source',
            message: `Cannot resolve re-export source: ${exp.from}`,
            line: exp.line
          });
          continue;
        }

        const isNodeModule = reExportedPathString.includes(path.sep + 'node_modules' + path.sep);
        if (isNodeModule) continue;

        const reExportedFileParseResult = this.fileParser(reExportedPathString);

        if (reExportedFileParseResult.fileNotFound) {
          issues.push({
            type: 'unresolved-re-export-source',
            message: `Re-export source file not found: ${reExportedPathString} (re-exported from ${exp.from})`,
            line: exp.line
          });
          continue;
        }
        if (reExportedFileParseResult.syntaxError) {
          issues.push({
            type: 'error-in-re-exported-file',
            message: `Syntax error in re-exported file ${reExportedPathString} (re-exported from ${exp.from})`,
            line: exp.line
          });
        }

        const reExportedAvailableExports = reExportedFileParseResult.exports || [];
        const reExportNames = new Set();
        let reExportHasDefault = false;
        let reExportHasAll = false;

        reExportedAvailableExports.forEach(rexp => {
          if (rexp.type === 'named' && rexp.specifiers) {
            rexp.specifiers.forEach(specName => reExportNames.add(specName));
          } else if (rexp.type === 'default') {
            reExportHasDefault = true;
          } else if (rexp.type === 're-export' && rexp.specifiers) {
            rexp.specifiers.forEach(spec => reExportNames.add(spec.exportedName));
          } else if (rexp.type === 'all' && rexp.from) {
            reExportHasAll = true;
          }
        });

        if (exp.specifiers) {
          exp.specifiers.forEach(spec => {
            const nameInSource = spec.localName;
            if (!reExportNames.has(nameInSource) && !(nameInSource === 'default' && reExportHasDefault) && !reExportHasAll) {
              issues.push({
                type: 'missing-re-exported-name',
                message: `Re-exported name '${nameInSource}' (as '${spec.exportedName}') not found in '${path.basename(reExportedPathString)}'.`,
                line: exp.line,
                importName: nameInSource
              });
            }
          });
        }
      } else if (exp.type === 'all' && exp.from) {
        let resolvedAllPath;
        try {
          resolvedAllPath = this.aliasResolver.resolveImportPath(exp.from, baseDir);
          const allExportedFileParseResult = this.fileParser(resolvedAllPath);
          if (allExportedFileParseResult.fileNotFound) {
            issues.push({
              type: 'unresolved-re-export-all-source',
              message: `Source file not found for 'export * from "${exp.from}"' (resolved to ${resolvedAllPath}).`,
              line: exp.line
            });
          } else if (allExportedFileParseResult.syntaxError) {
            issues.push({
              type: 'error-in-re-exported-all-source',
              message: `Syntax error in source file for 'export * from "${exp.from}"' (${resolvedAllPath}).`,
              line: exp.line
            });
          }
        } catch (error) {
          issues.push({
            type: 'unresolved-re-export-all-source',
            message: `Cannot resolve source for 'export * from "${exp.from}"': ${error.message}`,
            line: exp.line
          });
        }
      }
    }
  }
}

module.exports = ExportValidator;
