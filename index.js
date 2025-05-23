const chalk = require('chalk').default;
const AliasResolver = require('./src/aliasResolver');
const Analyzer = require('./src/analyzer');
const CLI = require('./src/cli');

if (require.main === module) {
  const cli = new CLI();
  cli.run().catch(error => {
    console.error(chalk.red(`❌ Unexpected error: ${error.message}`));
    process.exit(1);
  });
}

module.exports = { Analyzer, AliasResolver, CLI };
