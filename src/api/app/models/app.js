// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of purpleteam.

// purpleteam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// purpleteam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with purpleteam. If not, see <https://www.gnu.org/licenses/>.

const { readFile } = require('fs').promises;
const cucumber = require('@cucumber/cucumber');
const { getActiveTestCasesFromFilesystem } = require('src/scripts/cucumber-redacted');

const model = require('.');

const statusMap = {
  'awaiting job': true,
  'initialising job': false,
  'app tests are running': false
};


class App {
  constructor(options) {
    const { log, strings, emissary, cucumber: cucumberConfig, results, publisher, runType, cloud, debug } = options;

    this.log = log;
    this.strings = strings;
    this.emissary = emissary;
    this.cucumber = cucumberConfig;
    this.results = results;
    this.publisher = publisher;
    this.runType = runType;
    this.cloud = cloud;
    this.debug = debug;
    this.status = (state) => {
      if (state) {
        Object.keys(statusMap).forEach((k) => { statusMap[k] = false; });
        statusMap[state] = true;
        this.log.info(`Setting status to: "${state}"`, { tags: ['app'] });
        return state;
      }
      return Object.entries(statusMap).find((e) => e[1] === true)[0];
    };
  }

  async runJob(testJob) {
    this.log.info(`Status currently set to: "${this.status()}"`, { tags: ['app'] });
    if (this.status() !== 'awaiting job') return this.status();
    this.status('initialising job');
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

  // Receiving appEmissaryPort and seleniumPort are only essential if running in cloud environment.
  createCucumberArgs({ sessionProps = {}, emissaryHost = this.emissary.hostname, seleniumContainerName = '', appEmissaryPort = this.emissary.port, seleniumPort = 4444 }) {
    // sut.validateProperties(sutProperties);
    this.log.debug(`seleniumContainerName is: ${seleniumContainerName}`, { tags: ['app'] });
    const emissaryProperties = {
      hostname: emissaryHost,
      protocol: this.emissary.protocol,
      port: appEmissaryPort,
      apiKey: this.emissary.apiKey,
      apiFeedbackSpeed: this.emissary.apiFeedbackSpeed,
      reportDir: this.emissary.report.dir,
      spider: this.emissary.spider
    };

    // zap.validateProperties(emissaryProperties);

    const cucumberParameters = {
      emissaryProperties,
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
      `--format=message:${this.results.dir}result_testSessionId-${sessionProps.testSession ? sessionProps.testSession.id : 'noSessionPropsAvailable'}_${this.strings.NowAsFileName('-')}.NDJSON`,
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
    const configuration = await cucumberCli.getConfiguration();
    const activeTestCases = await getActiveTestCasesFromFilesystem({
      cwd: process.cwd(),
      eventBroadcaster: (() => new (require('events'))())(), // eslint-disable-line global-require
      featureDefaultLanguage: configuration.featureDefaultLanguage,
      featurePaths: configuration.featurePaths,
      pickleFilter: (() => new (require('@cucumber/cucumber/lib/pickle_filter')).default(configuration.pickleFilterOptions))() // eslint-disable-line global-require, new-cap
    });
    return activeTestCases;
  }

  // eslint-disable-next-line class-methods-use-this
  async testPlanText(activeTestCases) {
    const activeTestFileUris = activeTestCases
      .map((currentValue) => currentValue.uri);
      // .filter((currentValue, currentElementIndex, urisOfActiveTestCases) => urisOfActiveTestCases.indexOf(currentValue) === currentElementIndex); // Was there a point to this line?
    return (await Promise.all(activeTestFileUris
      .map((featureFileUri) => readFile(`${process.cwd()}/${featureFileUri}`, { encoding: 'utf8' }))))
      .reduce((accumulatedFeatures, feature) => accumulatedFeatures.concat(...['\n\n', feature]));
  }
}


module.exports = App;
