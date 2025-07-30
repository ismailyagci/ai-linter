const path = require('path');
const builtinModules = new Set(require('module').builtinModules);

class ImportResolver {
  constructor(aliasResolver, fileParser) {
    this.aliasResolver = aliasResolver;
    this.fileParser = fileParser; 
  }

  resolveImports(imports, baseDir, issues) {
    const resolvedImports = [];
    for (const imp of imports) {
      let resolvedPathString;
      try {
        resolvedPathString = this.aliasResolver.resolveImportPath(imp.path, baseDir);
      } catch (error) {
        resolvedImports.push({ ...imp, status: 'failed', error: error.message });
        issues.push({ type: 'unresolved-import', message: `Cannot resolve: ${imp.path}`, line: imp.line });
        continue;
      }

      const isCoreModule = builtinModules.has(resolvedPathString);
      const isNodeModulesFilePath = path.isAbsolute(resolvedPathString) && resolvedPathString.includes(path.sep + 'node_modules' + path.sep);
      const isPackageName = !isCoreModule && !path.isAbsolute(resolvedPathString) && !resolvedPathString.startsWith('.');

      let isExternal = false;
      if (isCoreModule || isNodeModulesFilePath || isPackageName) {
        isExternal = true;
      }

      if (isExternal) {
        resolvedImports.push({ ...imp, resolvedPath: resolvedPathString, status: 'resolved', isExternal: true });
        continue;
      }

      const supportedJSExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue'];
      const fileExtension = path.extname(resolvedPathString);
      
      if (!supportedJSExtensions.includes(fileExtension)) {
        resolvedImports.push({ ...imp, resolvedPath: resolvedPathString, status: 'resolved', isExternal: true });
        continue;
      }
      
      const importedFileParseResult = this.fileParser(resolvedPathString);

      if (importedFileParseResult.fileNotFound) {
        resolvedImports.push({ ...imp, resolvedPath: resolvedPathString, status: 'failed', error: importedFileParseResult.syntaxError.message });
        issues.push({ type: 'unresolved-import', message: `Resolved file not found: ${resolvedPathString} (imported as ${imp.path})`, line: imp.line });
        continue;
      }
      if (importedFileParseResult.syntaxError) {
        resolvedImports.push({ ...imp, resolvedPath: resolvedPathString, status: 'warning', error: `Syntax error in imported file: ${resolvedPathString}` });
        issues.push({ type: 'error-in-imported-file', message: `Syntax error in ${resolvedPathString} (imported as ${imp.path})`, line: imp.line });
      } else {
        resolvedImports.push({ ...imp, resolvedPath: resolvedPathString, status: 'resolved', parsedExports: importedFileParseResult.exports });
      }
    }
    return resolvedImports;
  }

  resolveDynamicImports(dynamicImports, baseDir, issues) {
    const resolvedDynamicImports = [];
    for (const imp of dynamicImports) {
      let resolvedPathString;
      try {
        resolvedPathString = this.aliasResolver.resolveImportPath(imp.path, baseDir);
      } catch (error) {
        resolvedDynamicImports.push({ ...imp, status: 'failed', error: error.message });
        issues.push({ type: 'unresolved-dynamic-import', message: `Cannot resolve dynamic import: ${imp.path}`, line: imp.line });
        continue;
      }

      const isCoreModule = builtinModules.has(resolvedPathString);
      const isNodeModulesFilePath = path.isAbsolute(resolvedPathString) && resolvedPathString.includes(path.sep + 'node_modules' + path.sep);
      const isPackageName = !isCoreModule && !path.isAbsolute(resolvedPathString) && !resolvedPathString.startsWith('.');

      let isExternal = false;
      if (isCoreModule || isNodeModulesFilePath || isPackageName) {
        isExternal = true;
      }

      if (isExternal) {
        resolvedDynamicImports.push({ ...imp, resolvedPath: resolvedPathString, status: 'resolved', isExternal: true });
        continue;
      }
      
      resolvedDynamicImports.push({
        ...imp,
        resolvedPath: resolvedPathString,
        status: 'resolved'
      });
    }
    return resolvedDynamicImports;
  }
}

module.exports = ImportResolver;
