const fs = require('fs');
const path = require('path');
const builtinModules = new Set(require('module').builtinModules);

class AliasResolver {
  constructor(cwd = process.cwd()) {
    this.cwd = path.resolve(cwd);
    this.aliasMap = {};
    this.loadAllAliases();
  }

  loadAllAliases() {
    this.aliasMap = {
      ...this.resolveJsconfigAliases(),
      ...this.resolveTsconfigAliases(),
      ...this.resolveBabelAliases(),
      ...this.resolveWebpackAliases(),
      ...this.resolveViteAliases(),
      ...this.resolveNextjsAliases(),
    };
  }

  resolveJsconfigAliases(relativeConfigPath = './jsconfig.json') {
    return this.resolveConfigPaths(relativeConfigPath);
  }

  resolveTsconfigAliases(relativeConfigPath = './tsconfig.json') {
    return this.resolveConfigPaths(relativeConfigPath);
  }

  resolveConfigPaths(relativeConfigPath) {
    const configPath = path.resolve(this.cwd, relativeConfigPath);
    if (!fs.existsSync(configPath)) return {};
    
    try {
      const json = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const paths = json.compilerOptions?.paths || {};
      const baseUrl = json.compilerOptions?.baseUrl || '.';
      const baseDirForAliases = path.resolve(path.dirname(configPath), baseUrl);
      const aliasMap = {};

      for (const alias in paths) {
        const cleanAlias = alias.replace(/\/\*$/, '');
        const targets = Array.isArray(paths[alias]) ? paths[alias] : [paths[alias]];
        const cleanTarget = targets[0].replace(/\/\*$/, '');
        aliasMap[cleanAlias] = path.resolve(baseDirForAliases, cleanTarget);
      }
      return aliasMap;
    } catch (error) {
      console.warn(`Warning: Could not parse ${configPath}: ${error.message}`);
      return {};
    }
  }

  resolveBabelAliases(relativeConfigPath = './babel.config.js') {
    const configPath = path.resolve(this.cwd, relativeConfigPath);
    if (!fs.existsSync(configPath)) return {};
    
    try {
      delete require.cache[configPath];
      const config = require(configPath);
      const aliasConfig = config?.plugins?.find(p => 
        Array.isArray(p) && p[0] === 'module-resolver'
      )?.[1]?.alias || {};
      
      const aliasMap = {};
      for (const alias in aliasConfig) {
        aliasMap[alias] = path.resolve(path.dirname(configPath), aliasConfig[alias]);
      }
      return aliasMap;
    } catch (error) {
      console.warn(`Warning: Could not load ${configPath}: ${error.message}`);
      return {};
    }
  }

  resolveWebpackAliases(relativeConfigPath = './webpack.config.js') {
    const configPath = path.resolve(this.cwd, relativeConfigPath);
    if (!fs.existsSync(configPath)) return {};
    
    try {
      delete require.cache[configPath];
      const config = require(configPath);
      const aliasConfig = config?.resolve?.alias || {};
      
      const aliasMap = {};
      for (const alias in aliasConfig) {
        aliasMap[alias] = path.resolve(path.dirname(configPath), aliasConfig[alias]);
      }
      return aliasMap;
    } catch (error) {
      console.warn(`Warning: Could not load ${configPath}: ${error.message}`);
      return {};
    }
  }

  resolveViteAliases(relativeConfigPath = './vite.config.js') {
    const configPath = path.resolve(this.cwd, relativeConfigPath);
    if (!fs.existsSync(configPath)) return {};
    
    try {
      delete require.cache[configPath];
      const config = require(configPath);
      const aliasConfig = config?.resolve?.alias || {};
      
      const aliasMap = {};
      for (const alias in aliasConfig) {
        aliasMap[alias] = path.resolve(path.dirname(configPath), aliasConfig[alias]);
      }
      return aliasMap;
    } catch (error) {
      console.warn(`Warning: Could not load ${configPath}: ${error.message}`);
      return {};
    }
  }

  resolveNextjsAliases() {
    const aliasMap = {};
    const nextjsBaseDirs = {
      '@/pages': './pages',
      '@/components': './components',
      '@/lib': './lib',
      '@/utils': './utils'
    };

    for (const alias in nextjsBaseDirs) {
      const dirPath = path.resolve(this.cwd, nextjsBaseDirs[alias]);
      if (fs.existsSync(dirPath)) {
        aliasMap[alias] = dirPath;
      }
    }
    return aliasMap;
  }

  resolveImportPath(importPath, basedir) {
    if (importPath.startsWith('.') || path.isAbsolute(importPath)) {
      const resolved = path.resolve(basedir, importPath);
      return this.findExistingFile(resolved);
    }

    if (builtinModules.has(importPath)) {
      return importPath; 
    }

    for (const alias in this.aliasMap) {
      if (importPath === alias) {
        return this.findExistingFile(this.aliasMap[alias]);
      }
      if (importPath.startsWith(alias + '/')) {
        const pathAfterAlias = importPath.substring(alias.length + 1);
        const realPath = path.join(this.aliasMap[alias], pathAfterAlias);
        return this.findExistingFile(realPath);
      }
    }

    try {
      const resolvedByRequire = require.resolve(importPath, { paths: [basedir, this.cwd] });
      if (path.isAbsolute(resolvedByRequire) && !resolvedByRequire.includes('node_modules')) {
         return this.findExistingFile(resolvedByRequire);
      }
      return resolvedByRequire; 
    } catch (error) {
      throw new Error(`Cannot resolve module: ${importPath} (from ${basedir})`);
    }
  }

  findExistingFile(basePath) {
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.vue'];
    
    if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
      return basePath;
    }

    if (!path.extname(basePath)) {
      for (const ext of extensions) {
        const withExt = basePath + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }

      if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
        for (const ext of extensions) {
          const indexFile = path.join(basePath, `index${ext}`);
          if (fs.existsSync(indexFile)) {
            return indexFile;
          }
        }
      }
    }

    throw new Error(`File not found: ${basePath}`);
  }
}

module.exports = AliasResolver;
