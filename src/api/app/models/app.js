// https://robbg.io/blog/2017-03-31-async-await-and-node-fs/
// http://2ality.com/2017/05/util-promisify.html
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const sut = require('../do/sut');
const zap = require('../../../slaves/zap');

class App {
  constructor(config) {
    const { slave, cucumber, results } = config;
    
    this.slave = slave;
    this.cucumber = cucumber;
    this.results = results;

  }

  async runJob(testJob) {

    // Need to return configured cucumberCli as well
    const { cucumberCli, activeTestCases } = await this.configureCucumberCli(testJob);
    const testPlan = await this.testPlanText(activeTestCases);

    const clearRequireCache = function clearRequireCache() {
      Object.keys(require.cache).forEach(key => delete require.cache[key])
    };

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


  async testPlan(testJob) {
    const { activeTestCases } = await this.configureCucumberCli(testJob);
    return await testPlanText(activeTestCases);
  }


  async configureCucumberCli(testJob) {
    const cucumber = require('cucumber');


    const sutProperties = {
      protocol: testJob.data.attributes.sutProtocol,
      ip: testJob.data.attributes.sutIp,
      port: testJob.data.attributes.sutPort,
      browser: testJob.data.attributes.browser[0],
      authentication: testJob.data.attributes.sutAuthentication,
      route: testJob.included[0].relationships.data[0].id,
      routeFields: testJob.included[2].attributes
    };

    sut.validateProperties(sutProperties);

    const slaveProperties = {
      protocol: this.slave.protocol,
      ip: this.slave.ip,
      port: this.slave.port,
      apiKey: this.slave.apiKey,
      apiFeedbackSpeed: this.slave.apiFeedbackSpeed,
      reportDir: this.slave.report.dir
    };

    zap.validateProperties(slaveProperties);

    // Todo: KC: probably best to weed out the unnecessary testJob properties.
    const cucumberParameters = {
      sutProperties,
      slaveProperties,      
      cucumber: {
        timeOut: this.cucumber.timeOut
      }
    };


    const parameters = JSON.stringify(cucumberParameters);

    const cucumberArgs = [
      'node',
      this.cucumber.binary,
      this.cucumber.features,
      '--require',
      this.cucumber.steps,
      /*'--exit',*/
      `--format=json:${this.results.uri}`,
      '--tags',
      this.cucumber.tagExpression,
      '--world-parameters',
      parameters
    ];

   

    // Todo: KC: Use passed config to work out which route, etc, to test

    // Todo: Keep record of how each test session is doing, if we are testing. This is in next PBI.


    // Todo: KC: I think we need to run Zap [session] times.




    // Get help with cucumber cli:
    // node ./node_modules/.bin/cucumber-js --help

    // Debug cucumber cli without actually running the tests (--dry-run). --dry-run to check that all glue code exists: https://github.com/cucumber/cucumber-jvm/issues/907
    // node --inspect-brk ./node_modules/.bin/cucumber-js --dry-run src/features --require src/steps --tags "not @simple_math"

    const cucumberCli = new cucumber.Cli({
      argv: cucumberArgs,
      cwd: process.cwd(),
      stdout: process.stdout
    });

    // Files to work the below out where in:
    // https://github.com/cucumber/cucumber-js/blob/master/src/cli/index.js
    // https://github.com/cucumber/cucumber-js/blob/master/src/cli/helpers.js#L20
    // https://github.com/cucumber/cucumber-js/blob/master/src/cli/configuration_builder.js
    const configuration = await cucumberCli.getConfiguration();
    const activeTestCases = await cucumber.getTestCasesFromFilesystem({
      cwd: process.cwd(),
      eventBroadcaster: ( () => new (require('events'))() )(),
      featureDefaultLanguage: configuration.featureDefaultLanguage,
      featurePaths: configuration.featurePaths,
      order: configuration.order,  
      pickleFilter: ( () => new (require('cucumber/lib/pickle_filter')).default(configuration.pickleFilterOptions) )()
    });

    return {cucumberCli, activeTestCases};
  }


  async testPlanText(activeTestCases) {
    const activeTestFileUris = activeTestCases.map(currentValue => currentValue.uri).filter( (currentValue, currentElementIndex, urisOfActiveTestCases) => urisOfActiveTestCases.indexOf(currentValue) === currentElementIndex );
    return (await Promise.all(activeTestFileUris.map( featureFileUri => readFileAsync(`${process.cwd()}/${featureFileUri}`, {encoding: 'utf8'}) )))
    .reduce( (accumulatedFeatures, feature) => accumulatedFeatures.concat(...['\n\n', feature]) );
  }


  async testResult() {



    let result;

    try {
      result = await readFileAsync(this.results.uri, {encoding: 'utf8'})
    }
    catch (err) {
      // Todo: use proper logger.
      console.log('ERROR:', err);
    }

    return result;
  }






}



module.exports = App;
