const fs = require('fs');
const path = require('path');
const chalk = require('chalk').default;

const DEFAULT_CONFIG_FILENAME = '.analyzerconfig.json';

class ConfigLoader {
  constructor(cwd = process.cwd(), configFileName = DEFAULT_CONFIG_FILENAME) {
    this.cwd = path.resolve(cwd);
    this.configFileName = configFileName;
  }

  loadConfig() {
    const configFilePath = path.resolve(this.cwd, this.configFileName);
    let fileConfig = {};

    if (fs.existsSync(configFilePath)) {
      try {
        const fileContent = fs.readFileSync(configFilePath, 'utf-8');
        fileConfig = JSON.parse(fileContent);
        console.log(chalk.gray(`Loaded configuration from ${configFilePath}`));
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Warning: Could not parse ${this.configFileName} at ${configFilePath}: ${error.message}`));
      }
    }
    return fileConfig;
  }
}

module.exports = ConfigLoader;
