// https://robbg.io/blog/2017-03-31-async-await-and-node-fs/
// http://2ality.com/2017/05/util-promisify.html
const fs = require('fs');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const cucumber = require('cucumber');

const model = require('.');


class App {
  constructor(options) {
    const { log, strings, slave, cucumber: cucumberConfig, results, publisher, runType, cloud, debug } = options;

    this.log = log;
    this.strings = strings;
    this.slave = slave;
    this.cucumber = cucumberConfig;
    this.results = results;
    this.publisher = publisher;
    this.runType = runType;
    this.cloud = cloud;
    this.debug = debug;
    this.slavesDeployed = false;
  }

  async runJob(testJob) {
    this.log.info(`${this.slavesDeployed ? 'slaves already deployed.' : 'running testJob.'}`, { tags: ['app'] });
    if (this.slavesDeployed) return 'Request ignored. Slaves already deployed.';
    const testRoutes = testJob.included.filter((resourceObject) => resourceObject.type === 'route');
    const testSessions = testJob.included.filter((resourceObject) => resourceObject.type === 'testSession');


    const sessionsProps = testSessions.map((sesh) => ({
      testRoutes,
      protocol: testJob.data.attributes.sutProtocol,
      ip: testJob.data.attributes.sutIp,
      port: testJob.data.attributes.sutPort,
      browser: testJob.data.attributes.browser,
      loggedInIndicator: testJob.data.attributes.loggedInIndicator,
      context: { name: `${sesh.id}_Context` },
      authentication: testJob.data.attributes.sutAuthentication,
      reportFormats: testJob.data.attributes.reportFormats,
      testSession: sesh // The data array contains the relationships to the testSessions
    }));

    const returnStatus = await model[this.runType]({ model: this, sessionsProps });
    return returnStatus; // This is propagated per session in the CLI model.
  }


  async testPlan(testJob) { // eslint-disable-line no-unused-vars
    const cucumberArgs = this.createCucumberArgs({});
    const cucumberCliInstance = new cucumber.Cli({
      argv: ['node', ...cucumberArgs],
      cwd: process.cwd(),
      stdout: process.stdout
    });
    const activeTestCases = await this.getActiveTestCases(cucumberCliInstance);
    const testPlan = await this.testPlanText(activeTestCases);
    return testPlan;
  }

  // Receiving appSlavePort and seleniumPort are only essential if running in cloud environment.
  createCucumberArgs({ sessionProps = {}, slaveHost = this.slave.hostname, seleniumContainerName = '', appSlavePort = this.slave.port, seleniumPort = 4444 }) {
    // sut.validateProperties(sutProperties);
    this.log.debug(`seleniumContainerName is: ${seleniumContainerName}`, { tags: ['app'] });
    const slaveProperties = {
      hostname: slaveHost,
      protocol: this.slave.protocol,
      port: appSlavePort,
      apiKey: this.slave.apiKey,
      apiFeedbackSpeed: this.slave.apiFeedbackSpeed,
      reportDir: this.slave.report.dir,
      spider: this.slave.spider
    };

    // zap.validateProperties(slaveProperties);

    const cucumberParameters = {
      slaveProperties,
      seleniumContainerName,
      seleniumPort,
      sutProperties: sessionProps,
      cucumber: { timeOut: this.cucumber.timeOut }
    };

    const parameters = JSON.stringify(cucumberParameters);

    this.log.debug(`The cucumberParameters are: ${parameters}`, { tags: ['app'] });

    const cucumberArgs = [
      this.cucumber.binary,
      this.cucumber.features,
      '--require',
      this.cucumber.steps,
      /* '--exit', */
      `--format=json:${this.results.dir}result_testSessionId-${sessionProps.testSession ? sessionProps.testSession.id : 'noSessionPropsAvailable'}_${this.strings.NowAsFileName('-')}.json`,
      /* Todo: Provide ability for Build User to pass flag to disable colours */
      '--format-options',
      '{"colorsEnabled": true}',
      '--tags',
      this.cucumber.tagExpression,
      '--world-parameters',
      parameters
    ];

    // Todo: KC: Validation, Filtering and Sanitisation required, as these are being executed, although they should all be under our control.
    return cucumberArgs;
  }

  // eslint-disable-next-line class-methods-use-this
  async getActiveTestCases(cucumberCli) {
    // Files to work the below out where in:
    // https://github.com/cucumber/cucumber-js/blob/master/src/cli/index.js
    // https://github.com/cucumber/cucumber-js/blob/master/src/cli/helpers.js#L20
    // https://github.com/cucumber/cucumber-js/blob/master/src/cli/configuration_builder.js
    const configuration = await cucumberCli.getConfiguration();
    const activeTestCases = await cucumber.getTestCasesFromFilesystem({
      cwd: process.cwd(),
      eventBroadcaster: (() => new (require('events'))())(), // eslint-disable-line global-require
      featureDefaultLanguage: configuration.featureDefaultLanguage,
      featurePaths: configuration.featurePaths,
      order: configuration.order,
      pickleFilter: (() => new (require('cucumber/lib/pickle_filter')).default(configuration.pickleFilterOptions))() // eslint-disable-line global-require, new-cap
    });
    return activeTestCases;
  }

  // eslint-disable-next-line class-methods-use-this
  async testPlanText(activeTestCases) {
    const activeTestFileUris = activeTestCases
      .map((currentValue) => currentValue.uri)
      .filter((currentValue, currentElementIndex, urisOfActiveTestCases) => urisOfActiveTestCases.indexOf(currentValue) === currentElementIndex);
    return (await Promise.all(activeTestFileUris
      .map((featureFileUri) => readFileAsync(`${process.cwd()}/${featureFileUri}`, { encoding: 'utf8' }))))
      .reduce((accumulatedFeatures, feature) => accumulatedFeatures.concat(...['\n\n', feature]));
  }
}


module.exports = App;
