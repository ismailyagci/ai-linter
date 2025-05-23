const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk').default;
const AliasResolver = require('./aliasResolver');
const AstDataExtractor = require('./analyzers/astDataExtractor');
const ImportResolver = require('./analyzers/importResolver');
const ExportValidator = require('./analyzers/exportValidator');

class Analyzer {
  constructor(cwd = process.cwd()) {
    this.cwd = path.resolve(cwd);
    this.aliasResolver = new AliasResolver(this.cwd);
    this.astDataExtractor = new AstDataExtractor();
    this.fileParser = this._performParse.bind(this);
    this.importResolver = new ImportResolver(this.aliasResolver, this.fileParser);
    this.exportValidator = new ExportValidator(this.fileParser, this.aliasResolver);
    this.supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue'];
    this.fileCache = new Map();
  }

  _performParse(filePath) {
    const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(this.cwd, filePath);
    if (this.fileCache.has(absoluteFilePath)) {
      return this.fileCache.get(absoluteFilePath);
    }

    if (!fs.existsSync(absoluteFilePath)) {
      const result = {
        fileNotFound: true,
        syntaxError: { message: `File not found: ${absoluteFilePath}` },
        imports: [], dynamicImports: [], exports: [], unusedImports: [], codeIssues: []
      };
      this.fileCache.set(absoluteFilePath, result); 
      return result;
    }

    const code = fs.readFileSync(absoluteFilePath, 'utf-8');
    const ext = path.extname(absoluteFilePath);
    
    const parseOutput = this.astDataExtractor.extractData(code, absoluteFilePath, ext);
    const result = { ...parseOutput, fileNotFound: false, filePath: absoluteFilePath }; 
    this.fileCache.set(absoluteFilePath, result);
    return result;
  }
  
  _doAnalyzeFile(absoluteFilePath) {
    const dir = path.dirname(absoluteFilePath);
    const mainFileParseResult = this._performParse(absoluteFilePath);

    if (mainFileParseResult.fileNotFound) {
        return {
            file: absoluteFilePath,
            status: 'error',
            syntaxError: mainFileParseResult.syntaxError,
            imports: [],
            dynamicImports: [],
            exports: [],
            unusedImports: [],
            issues: [{ type: 'file-not-found', message: mainFileParseResult.syntaxError.message, line: 1 }]
        };
    }
    if (mainFileParseResult.syntaxError) {
      return {
        file: absoluteFilePath,
        status: 'error',
        syntaxError: mainFileParseResult.syntaxError,
        imports: [],
        dynamicImports: [],
        exports: mainFileParseResult.exports,
        unusedImports: mainFileParseResult.unusedImports,
        issues: [] 
      };
    }

    const issues = [];
    if (mainFileParseResult.codeIssues && mainFileParseResult.codeIssues.length > 0) {
      issues.push(...mainFileParseResult.codeIssues);
    }

    const resolvedImports = this.importResolver.resolveImports(mainFileParseResult.imports, dir, issues);
    const resolvedDynamicImports = this.importResolver.resolveDynamicImports(mainFileParseResult.dynamicImports, dir, issues);

    resolvedImports.forEach(imp => {
      if (imp.status === 'resolved' && !imp.isExternal && imp.parsedExports) {
        const namedImportIssues = this.exportValidator.validateNamedImports(imp, imp.parsedExports, imp.resolvedPath);
        if (namedImportIssues.length > 0) {
          imp.status = 'warning'; 
          imp.issues = (imp.issues || []).concat(namedImportIssues);
          issues.push(...namedImportIssues);
        }
      }
    });

    this.exportValidator.validateReExports(mainFileParseResult.exports, dir, issues);

    if (mainFileParseResult.unusedImports.length > 0) {
      issues.push({
        type: 'unused-imports',
        message: `Unused imports: ${mainFileParseResult.unusedImports.join(', ')}`,
        identifiers: mainFileParseResult.unusedImports
      });
    }

    const errorIssueTypes = new Set([
        'unresolved-import',
        'error-in-imported-file',
        'unresolved-named-import',
        'unresolved-default-import',
        'file-not-found',
        'unresolved-re-export-source',
        'error-in-re-exported-file',
        'missing-re-exported-name',
        'unresolved-re-export-all-source',
        'error-in-re-exported-all-source',
        'undeclared-identifier',
        'undeclared-jsx-component',
        'eval-usage',
        'debugger-statement',
        'duplicate-object-key'
    ]);

    const finalStatus = issues.length > 0 
        ? (issues.some(iss => errorIssueTypes.has(iss.type)) ? 'error' : 'warning') 
        : 'ok';

    return {
      file: absoluteFilePath,
      status: finalStatus,
      syntaxError: mainFileParseResult.syntaxError, 
      imports: resolvedImports,
      dynamicImports: resolvedDynamicImports,
      exports: mainFileParseResult.exports,
      unusedImports: mainFileParseResult.unusedImports,
      issues
    };
  }

  analyzeFile(filePath) {
    this.fileCache.clear();
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(this.cwd, filePath);
    return this._doAnalyzeFile(absolutePath);
  }

  analyzeDirectory(dirPath, options = {}) {
    this.fileCache.clear();
    const absoluteDirPath = path.isAbsolute(dirPath) ? dirPath : path.resolve(this.cwd, dirPath);

    const {
      extensions = this.supportedExtensions,
      ignore = ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
      recursive = true
    } = options;

    const pattern = recursive 
      ? `${absoluteDirPath}/**/*{${extensions.join(',')}}`
      : `${absoluteDirPath}/*{${extensions.join(',')}}`;

    const files = glob.sync(pattern, { ignore, cwd: this.cwd, absolute: true });
    const results = [];

    console.log(chalk.blue(`Analyzing ${files.length} files in ${absoluteDirPath}...`));

    for (const file of files) {
      try {
        const result = this._doAnalyzeFile(file); 
        results.push(result);
        
        if (results.length % 10 === 0) {
          process.stdout.write(chalk.gray('.'));
        }
      } catch (error) {
        results.push({
          file: path.isAbsolute(file) ? file : path.resolve(this.cwd, file),
          status: 'error',
          syntaxError: { message: error.message }, 
          imports: [],
          dynamicImports: [],
          exports: [],
          unusedImports: [],
          issues: []
        });
      }
    }

    console.log(chalk.green('\nAnalysis complete!'));
    return this.generateSummary(results);
  }

  generateSummary(results) {
    const summary = {
      totalFiles: results.length,
      filesWithErrors: 0,
      filesWithWarnings: 0,
      totalImports: 0,
      unresolvedImports: 0,
      unusedImports: 0,
      totalUndeclaredIdentifiers: 0,
      details: results
    };

    for (const result of results) {
      if (result.status === 'error') {
        summary.filesWithErrors++;
      }
      if (result.status === 'warning') { 
        summary.filesWithWarnings++;
      }

      summary.totalImports += result.imports?.length || 0;
      summary.totalImports += result.dynamicImports?.length || 0;
      
      if (result.imports) {
        summary.unresolvedImports += result.imports.filter(imp => imp.status === 'failed').length;
      }
      if (result.dynamicImports) {
        summary.unresolvedImports += result.dynamicImports.filter(imp => imp.status === 'failed').length;
      }
      if (result.issues) {
        summary.unresolvedImports += result.issues.filter(iss => 
            iss.type === 'unresolved-named-import' || 
            iss.type === 'unresolved-default-import' ||
            iss.type === 'unresolved-re-export-source' ||
            iss.type === 'missing-re-exported-name' ||
            iss.type === 'unresolved-re-export-all-source'
        ).length;
        result.issues.forEach(issue => {
          if (issue.type === 'undeclared-identifier' || issue.type === 'undeclared-jsx-component') {
            summary.totalUndeclaredIdentifiers++;
          }
        });
      }
      
      summary.unusedImports += result.unusedImports?.length || 0;
    }

    return summary;
  }
}

module.exports = Analyzer;
