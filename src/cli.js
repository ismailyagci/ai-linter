const fs = require('fs');
const path = require('path');
const chalk = require('chalk').default;
const Analyzer = require('./analyzer');
const ConfigLoader = require('./configLoader');

class CLI {
  constructor() {
    this.cwd = process.cwd();
    this.configLoader = new ConfigLoader(this.cwd);
    this.analyzer = new Analyzer(this.cwd);
    this.fileConfig = {}; 
  }

  printUsage() {
    console.log(`
${chalk.bold('Analyzer - Advanced JavaScript/TypeScript Analysis Tool')}

Usage:
  node index.js <file|directory> [options]

Options:
  --recursive, -r      Scan subdirectories (default: true, configurable via .analyzerconfig.json)
  --extensions, -e     File extensions (default: .js,.jsx,.ts,.tsx,.vue, configurable via .analyzerconfig.json)
  --ignore, -i         Patterns to ignore (configurable via .analyzerconfig.json)
  --format, -f         Output format (json|table|summary) (default: table, configurable via .analyzerconfig.json)
  --output, -o         Output file (configurable via .analyzerconfig.json)
  --help, -h           Show this help message

Examples:
  node index.js src/
  node index.js src/components/Button.jsx
  node index.js . --format json --output report.json
  node index.js src --ignore "**/*.test.js,**/*.spec.js"
    `);
  }

  parseArgs(args) {
    const defaultOptions = {
      target: null,
      recursive: true,
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
      ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
      format: 'table',
      output: null
    };

    this.fileConfig = this.configLoader.loadConfig();

    let options = { ...defaultOptions, ...this.fileConfig };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--help' || arg === '-h') {
        this.printUsage();
        process.exit(0);
      } else if (arg === '--recursive' || arg === '-r') {
        options.recursive = true; 
      } else if (arg === '--extensions' || arg === '-e') {
        if (args[++i]) options.extensions = args[i].split(',');
      } else if (arg === '--ignore' || arg === '-i') {
        if (args[++i]) options.ignore = args[i].split(',');
      } else if (arg === '--format' || arg === '-f') {
        if (args[++i]) options.format = args[i];
      } else if (arg === '--output' || arg === '-o') {
        if (args[++i]) options.output = args[i];
      } else if (!options.target) {
        options.target = arg;
      }
    }
    if (this.fileConfig.recursive !== undefined && !args.some(a => a === '--recursive' || a === '-r')) {
        const cliRecursiveArg = args.find((_, idx) => args[idx-1] === '--recursive' || args[idx-1] === '-r');
        if (cliRecursiveArg === undefined) { 
            options.recursive = this.fileConfig.recursive;
        }
    }

    return options;
  }

  formatOutput(result, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      
      case 'summary':
        return this.formatSummary(result);
      
      case 'table':
      default:
        return this.formatTable(result);
    }
  }

  formatSummary(result) {
    if (result.details) {
      const { totalFiles, filesWithErrors, filesWithWarnings, totalImports, unresolvedImports, unusedImports, totalCriticalCodeIssues, totalConsoleUsage, totalTodoFixmeComments } = result;
      
      return `
${chalk.bold('📊 ANALYSIS SUMMARY')}
${chalk.gray('─'.repeat(50))}
📁 Total files: ${chalk.cyan(totalFiles)}
❌ Files with errors: ${chalk.red(filesWithErrors)}
⚠️  Files with warnings: ${chalk.yellow(filesWithWarnings)}
📦 Total imports: ${chalk.blue(totalImports)}
🔍 Unresolved imports/re-exports: ${chalk.red(unresolvedImports)} 
🗑️  Unused imports: ${chalk.yellow(unusedImports)}
🚫 Critical code issues: ${chalk.red(totalCriticalCodeIssues || 0)}
💻 Console usage: ${chalk.yellow(totalConsoleUsage || 0)}
📝 Total TODO/FIXME: ${chalk.magenta(totalTodoFixmeComments || 0)}

${this.getTopIssues(result.details)}
      `;
    } else {
      return this.formatSingleFile(result);
    }
  }

  formatTable(result) {
    if (result.details) {
      return this.formatDirectoryTable(result);
    } else {
      return this.formatSingleFile(result);
    }
  }

  formatDirectoryTable(result) {
    let output = this.formatSummary(result);
    
    const problemFiles = result.details.filter(file => 
      file.status === 'error' || (file.issues?.length > 0 && file.issues.some(iss => iss.type !== 'unused-imports'))
    );

    if (problemFiles.length > 0) {
      output += `
${chalk.bold('🚨 PROBLEMATIC FILES')}
`;
      output += chalk.gray('─'.repeat(80)) + '\n';
      
      problemFiles.forEach(file => {
        const relativePath = path.relative(this.cwd, file.file);
        output += `\n${chalk.cyan(relativePath)} (${this.getStatusIcon(file.status)} ${file.status.toUpperCase()})\n`;
        
        if (file.syntaxError) {
          let errMsg = file.syntaxError.message;
          if (file.syntaxError.line !== undefined) {
            errMsg += ` (line ${file.syntaxError.line}`;
            if (file.syntaxError.column !== undefined) {
              errMsg += `, column ${file.syntaxError.column + 1}`;
            }
            errMsg += `)`;
          }
          output += `  ${chalk.red('❌ Syntax Error:')} ${errMsg}\n`;
        }
        
        file.issues?.forEach(issue => {
          const errorTypes = [
            'unresolved-import', 'error-in-imported-file', 'unresolved-named-import', 'unresolved-default-import', 'file-not-found',
            'unresolved-re-export-source', 'error-in-re-exported-file', 'missing-re-exported-name',
            'unresolved-re-export-all-source', 'error-in-re-exported-all-source', 'undeclared-identifier',
            'undeclared-jsx-component', 'eval-usage', 'debugger-statement', 'duplicate-object-key'
          ];
          const icon = errorTypes.includes(issue.type) ? '❌' : 
                       (issue.type === 'unused-imports' ? '🗑️' : 
                       (issue.type === 'console-usage' ? '💻' : 
                       (issue.type === 'todo-comment' || issue.type === 'fixme-comment' ? '📝' : '⚠️')));
          output += `  ${icon} ${issue.message}${issue.line ? ` (line ${issue.line})` : ''}\n`;
        });
      });
    }

    return output;
  }

  formatSingleFile(result) {
    const relativePath = path.relative(this.cwd, result.file);
    let output = `\n${chalk.bold('📄 FILE ANALYSIS')}\n`;
    output += chalk.gray('─'.repeat(50)) + '\n';
    output += `${chalk.cyan('File:')} ${relativePath}\n`;
    output += `${chalk.cyan('Status:')} ${this.getStatusIcon(result.status)} ${result.status.toUpperCase()}\n`;

    if (result.syntaxError && result.status === 'error') {
      output += `\n${chalk.red('❌ SYNTAX ERROR')}\n`;
      output += chalk.gray('─'.repeat(30)) + '\n';
      let errMsg = result.syntaxError.message;
      if (result.syntaxError.line !== undefined) {
        errMsg += ` (line ${result.syntaxError.line}`;
        if (result.syntaxError.column !== undefined) {
          errMsg += `, column ${result.syntaxError.column + 1}`;
        }
        errMsg += `)`;
      }
      output += chalk.red(errMsg) + '\n';
      return output;
    }

    if (result.imports?.length > 0) {
      output += `\n${chalk.bold('📦 IMPORTS')}\n`;
      output += chalk.gray('─'.repeat(30)) + '\n';
      
      result.imports.forEach(imp => {
        const status = imp.status === 'resolved' ? chalk.green('✓') : (imp.status === 'failed' ? chalk.red('✗') : chalk.yellow('⚠️'));
        const line = imp.line ? chalk.gray(` (line ${imp.line})`) : '';
        output += `${status} ${imp.path}${line}\n`;
        
        if (imp.status === 'failed' || imp.status === 'warning') {
          if(imp.error) output += `   ${chalk.red('Error:')} ${imp.error}\n`;
          if(imp.issues) {
            imp.issues.forEach(iss => {
                 output += `   ${chalk.red('└ Issue:')} ${iss.message}\n`;
            });
          }
        }
        
        if (imp.specifiers?.length > 0) {
          const specs = imp.specifiers.map(s => s.alias || s.name).join(', ');
          output += `   ${chalk.gray('Imports:')} ${specs}\n`;
        }
      });
    }

    if (result.dynamicImports?.length > 0) {
      output += `\n${chalk.bold('🔄 DYNAMIC IMPORTS')}\n`;
      output += chalk.gray('─'.repeat(30)) + '\n';
      
      result.dynamicImports.forEach(imp => {
        const status = imp.status === 'resolved' ? chalk.green('✓') : chalk.red('✗');
        const line = imp.line ? chalk.gray(` (line ${imp.line})`) : '';
        output += `${status} ${imp.path}${line}\n`;
         if (imp.status === 'failed') {
          output += `   ${chalk.red('Error:')} ${imp.error}\n`;
        }
      });
    }

    if (result.exports?.length > 0) {
      output += `\n${chalk.bold('📤 EXPORTS')}\n`;
      output += chalk.gray('─'.repeat(30)) + '\n';
      
      result.exports.forEach(exp => {
        output += `• ${exp.type}`;
        if (exp.type === 're-export' && exp.specifiers) {
            const specs = exp.specifiers.map(s => s.localName === s.exportedName ? s.localName : `${s.localName} as ${s.exportedName}`).join(', ');
            output += `: { ${specs} }`;
        } else if (exp.specifiers && Array.isArray(exp.specifiers)) {
          output += `: { ${exp.specifiers.join(', ')} }`;
        }
        if (exp.from) {
          output += ` from ${exp.from}`;
        }
        if (exp.line) {
            output += chalk.gray(` (line ${exp.line})`);
        }
        output += '\n';
      });
    }
    
    const issueItems = result.issues?.filter(issue => issue.type !== 'unused-imports') || [];
    if (issueItems.length > 0) {
        output += `\n${chalk.bold('🚨 ISSUES (excluding unused)')}\n`;
        output += chalk.gray('─'.repeat(30)) + '\n';
        issueItems.forEach(issue => {
            const errorTypes = [
                'unresolved-import', 'error-in-imported-file', 'unresolved-named-import', 'unresolved-default-import', 'file-not-found',
                'unresolved-re-export-source', 'error-in-re-exported-file', 'missing-re-exported-name',
                'unresolved-re-export-all-source', 'error-in-re-exported-all-source', 'undeclared-identifier',
                'undeclared-jsx-component', 'eval-usage', 'debugger-statement', 'duplicate-object-key'
            ];
            const icon = errorTypes.includes(issue.type) ? '❌' : 
                         (issue.type === 'console-usage' ? '💻' : 
                         (issue.type === 'todo-comment' || issue.type === 'fixme-comment' ? '📝' : '⚠️'));
            output += `  ${icon} ${issue.message}${issue.line ? ` (line ${issue.line})` : ''}\n`;
        });
    }

    if (result.unusedImports?.length > 0) {
      output += `\n${chalk.bold('🗑️  UNUSED IMPORTS')}\n`;
      output += chalk.gray('─'.repeat(30)) + '\n';
      output += result.unusedImports.map(imp => `• ${chalk.yellow(imp)}`).join('\n') + '\n';
    }

    return output;
  }

  getStatusIcon(status) {
    switch (status) {
      case 'ok': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  }

  getTopIssues(details, limit = 5) {
    const criticalIssueTypes = [
        'unresolved-import', 'error-in-imported-file', 'unresolved-named-import', 'unresolved-default-import', 'file-not-found',
        'unresolved-re-export-source', 'error-in-re-exported-file', 'missing-re-exported-name',
        'unresolved-re-export-all-source', 'error-in-re-exported-all-source', 'undeclared-identifier',
        'undeclared-jsx-component', 'eval-usage', 'debugger-statement', 'duplicate-object-key'
    ];

    const issueFiles = details
      .filter(file => file.issues?.some(iss => criticalIssueTypes.includes(iss.type)))
      .sort((a, b) => {
        const aErrors = a.issues.filter(i => criticalIssueTypes.includes(i.type)).length;
        const bErrors = b.issues.filter(i => criticalIssueTypes.includes(i.type)).length;
        return bErrors - aErrors;
      })
      .slice(0, limit);

    if (issueFiles.length === 0 && !details.some(d => d.status === 'error' || (d.status === 'warning' && d.issues.some(iss => criticalIssueTypes.includes(iss.type) || iss.type === 'unused-imports')))) {
      if (!details.some(d => d.issues?.some(iss => iss.type === 'todo-comment' || iss.type === 'fixme-comment' || iss.type === 'console-usage'))) {
        return chalk.green('🎉 No problems found!');
      }
      return chalk.yellow('🔍 Only TODO/FIXME comments or console usage found. No critical problems.');
    }
    if (issueFiles.length === 0 && (details.some(d => d.status === 'error' || d.status === 'warning'))) {
      return chalk.yellow('🔍 See file-based analysis for a detailed list of problems.');
    }


    let output = `${chalk.bold('🔍 FILES WITH THE MOST CRITICAL PROBLEMS')}\n`;
    output += chalk.gray('─'.repeat(50)) + '\n';
    
    issueFiles.forEach((file, index) => {
      const relativePath = path.relative(this.cwd, file.file);
      const problemCount = file.issues.filter(i => criticalIssueTypes.includes(i.type)).length;
      output += `${index + 1}. ${chalk.cyan(relativePath)} (${this.getStatusIcon(file.status)} ${problemCount} critical problems)\n`;
    });

    return output;
  }

  async run() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 && !fs.existsSync(path.resolve(this.cwd, '.analyzerconfig.json'))) {
      this.printUsage();
      process.exit(1);
    }

    const options = this.parseArgs(args);
    
    if (!options.target && !this.fileConfig.target) {
      console.error(chalk.red('❌ Target file or directory not specified! (as .analyzerconfig.json or CLI argument)'));
      this.printUsage();
      process.exit(1);
    }
    if (!options.target && this.fileConfig.target) {
        options.target = this.fileConfig.target;
    }

    try {
      let result;
      const targetPath = path.resolve(this.cwd, options.target);
      
      if (!fs.existsSync(targetPath)) {
        console.error(chalk.red(`❌ File or directory not found: ${targetPath}`));
        process.exit(1);
      }

      if (fs.statSync(targetPath).isDirectory()) {
        result = this.analyzer.analyzeDirectory(targetPath, options);
      } else {
        result = this.analyzer.analyzeFile(targetPath);
      }

      const output = this.formatOutput(result, options.format);
      
      if (options.output) {
        const outputPath = path.isAbsolute(options.output) ? options.output : path.resolve(this.cwd, options.output);
        fs.writeFileSync(outputPath, output);
        console.log(chalk.green(`✅ Results saved to: ${outputPath}`));
      } else {
        console.log(output);
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      console.error(error.stack);
      process.exit(1);
    }
  }
}

module.exports = CLI;
