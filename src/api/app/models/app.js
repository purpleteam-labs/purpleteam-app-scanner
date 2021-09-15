// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of PurpleTeam.

// PurpleTeam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// PurpleTeam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this PurpleTeam project. If not, see <https://www.gnu.org/licenses/>.

const { promises: fsPromises } = require('fs');
const cucumber = require('@cucumber/cucumber');
const { GherkinStreams } = require('@cucumber/gherkin-streams');

const model = require('.');

const statusMap = {
  'Awaiting Job.': true,
  'Initialising Tester.': false,
  'Tester initialised.': false,
  'App tests are running.': false
};

class App {
  #testingProps;

  constructor(options) {
    const { log, strings, emissary, cucumber: cucumberConfig, results, publisher, runType, cloud, debug, s2Containers } = options;

    this.log = log;
    this.strings = strings;
    this.emissary = emissary;
    this.cucumber = cucumberConfig;
    this.results = results;
    this.publisher = publisher; // Todo: Remove publisher as it's not used.
    this.runType = runType;
    this.cloud = cloud;
    this.debug = debug;
    this.s2Containers = s2Containers;
    this.#testingProps = null;
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

  async initTester(testJob) {
    this.log.info(`Status currently set to: "${this.status()}"`, { tags: ['app'] });
    if (this.status() !== 'Awaiting Job.') return this.status();
    this.status('Initialising Tester.');
    const testRoutes = testJob.included.filter((resourceObject) => resourceObject.type === 'route');
    const testSessions = testJob.included.filter((resourceObject) => resourceObject.type === 'appScanner');

    const sessionsProps = testSessions.map((sesh) => ({
      testRoutes,
      protocol: testJob.data.attributes.sutProtocol,
      ip: testJob.data.attributes.sutIp,
      port: testJob.data.attributes.sutPort,
      browser: testJob.data.attributes.browser,
      loggedInIndicator: testJob.data.attributes.loggedInIndicator,
      context: { name: `${sesh.id}_Context` },
      authentication: testJob.data.attributes.sutAuthentication,
      testSession: sesh // The data array contains the relationships to the testSessions
    }));

    // const returnStatus = await model[this.runType]({ model: this, sessionsProps });
    const returnResult = await model.parallel.parallel({ model: this, sessionsProps });
    this.#testingProps = returnResult.testingProps;


    return returnResult.status; // This is propagated per session in the CLI model.
  }

  async reset() {
    const { deprovisionViaLambdaDto, cloudFuncOpts } = this.#testingProps;
    await model.parallel.reset({ deprovisionViaLambdaDto, cloudFuncOpts });
    this.#testingProps = null;
  }

  startCucs() { // eslint-disable-line class-methods-use-this
    model.parallel.startCucs(this.#testingProps);
  }


  async testPlan(testJob) { // eslint-disable-line no-unused-vars
    const cucumberArgs = this.createCucumberArgs({});
    const cucumberCliInstance = new cucumber.Cli({
      argv: ['node', ...cucumberArgs],
      cwd: process.cwd(),
      stdout: process.stdout
    });
    const activeFeatureFileUris = await this.getActiveFeatureFileUris(cucumberCliInstance);
    const testPlanText = await this.getTestPlanText(activeFeatureFileUris);
    return testPlanText;
  }

  // Receiving appEmissaryPort and seleniumPort are only essential if running in cloud environment.
  createCucumberArgs({ sessionProps = {}, emissaryHost = this.emissary.hostname, seleniumContainerName = '', appEmissaryPort = this.emissary.port, seleniumPort = 4444 }) {
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

    const cucumberParameters = {
      emissaryProperties,
      seleniumContainerName,
      seleniumPort,
      sutProperties: sessionProps,
      cucumber: { timeout: this.cucumber.timeout }
    };

    const parameters = JSON.stringify(cucumberParameters);

    this.log.debug(`The cucumberParameters are: ${parameters}`, { tags: ['app'] });

    const cucumberArgs = [
      this.cucumber.binary,
      this.cucumber.features,
      '--require',
      this.cucumber.steps,
      /* '--exit', */
      `--format=message:${this.results.dir}result_appScannerId-${sessionProps.testSession ? sessionProps.testSession.id : 'noSessionPropsAvailable'}_${this.strings.NowAsFileName('-')}.NDJSON`,
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
  async getActiveFeatureFileUris(cucumberCli) {
    const configuration = await cucumberCli.getConfiguration();
    const pickleFilter = (() => new (require('@cucumber/cucumber/lib/pickle_filter')).default(configuration.pickleFilterOptions))(); // eslint-disable-line global-require, new-cap

    const streamToArray = async (readableStream) => new Promise((resolve, reject) => {
      const items = [];
      readableStream.on('data', (item) => items.push(item));
      readableStream.on('error', (err) => reject(err));
      readableStream.on('end', () => resolve(items));
    });

    const activeFeatureFileUris = async () => {
      const envelopes = await streamToArray(GherkinStreams.fromPaths(configuration.featurePaths, { includeSource: false, includeGherkinDocument: true, includePickles: true }));
      let gherkinDocument = null;
      const pickles = [];

      envelopes.forEach((e) => {
        if (e.gherkinDocument) {
          gherkinDocument = e.gherkinDocument;
        } else if (e.pickle && gherkinDocument) {
          const { pickle } = e;
          if (pickleFilter.matches({ gherkinDocument, pickle })) pickles.push({ pickle });
        }
      });

      return pickles
        .map((p) => p.pickle.uri)
        .reduce((accum, cV) => [...accum, ...(accum.includes(cV) ? [] : [cV])], []);
    };

    return activeFeatureFileUris();
  }

  // eslint-disable-next-line class-methods-use-this
  async getTestPlanText(activeFeatureFileUris) {
    return (await Promise.all(activeFeatureFileUris
      .map((aFFU) => fsPromises.readFile(aFFU, { encoding: 'utf8' }))))
      .reduce((accumulatedFeatures, feature) => `${accumulatedFeatures}${!accumulatedFeatures.length > 0 ? feature : `\n\n${feature}`}`, '');
  }
}


module.exports = App;
