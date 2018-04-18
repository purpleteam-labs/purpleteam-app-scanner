

class App {
  constructor(config) {
    this.config = config;


  }

  async runJob() {

    const cucumber = require('cucumber');

    const clearRequireCache = function clearRequireCache() {
      Object.keys(require.cache).forEach(key => delete require.cache[key])
    }

    let args = []
      .concat(['node'])
      .concat([`${process.cwd}/node_modules/.bin/cucumber-js`]);
    




    // Todo: Work out which test features & steps we are going to run (the test plan).
    // Todo: Keep record of how each test session is doing, if we are testing.
    // 

    const testPlan = await this.testPlan();





    // Run tests

    // Todo: KC: Convert existing profile test to cucumber. 
    let cucumberCli = new cucumber.Cli({argv: args.concat(['src/features', '-r', 'src/steps', '--exit', `--format=json:${process.cwd()}/test/security/report.txt`]), cwd: process.cwd(), stdout: process.stdout});






    cucumberCli.run()
    .then((succeeded) => {
      console.log(succeeded);
      // clearSupportCodeFns();
      clearRequireCache();
        
    }).catch((error) => {
      console.log(error);
    });
    







    return testPlan;

  }

  async testPlan() {
    // https://robbg.io/blog/2017-03-31-async-await-and-node-fs/
    // http://2ality.com/2017/05/util-promisify.html
    const fs = require('fs');
    const { promisify } = require('util');
    const readFileAsync = promisify(fs.readFile);

    let testPlan;

    // Read testplan

    await readFileAsync(`${process.cwd()}/src/features/simple_math.feature`, {encoding: 'utf8'})
    .then((features) => {
      testPlan = features;
    
    });

    return testPlan;

  }


  async testResult() {

    const fs = require('fs');
    const { promisify } = require('util');
    const readFileAsync = promisify(fs.readFile);

    let result;

    try {
      result = await readFileAsync(`${process.cwd()}/test/security/report.txt`, {encoding: 'utf8'})
    }
    catch (err) {
      // Todo: use proper logger.
      console.log('ERROR:', err);
    }

    return result;


  }

}

module.exports = App;
