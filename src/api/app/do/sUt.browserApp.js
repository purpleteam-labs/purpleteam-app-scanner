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

const Joi = require('joi');
const Sut = require('./sUt');
/* eslint-disable import/no-dynamic-require */
const WebDriverFactory = require(`${process.cwd()}/src/drivers/webDriverFactory`);
const browser = require(`${process.cwd()}/src/clients/browser`);
// Strategies.
const sitesTreeSutAuthenticationPopulation = require(`${process.cwd()}/src/sUtAndEmissaryStrategies/1_sitesTreeSutAuthenticationPopulation`);
/* eslint-enable import/no-dynamic-require */


class BrowserApp extends Sut {
  #configSchemaProps;
  #sutSchema;
  // Strategies specific to BrowserApp.
  #SitesTreeSutAuthenticationPopulation;

  #createSchema() {
    this.#sutSchema = Joi.object({
      sUtType: Joi.string().required().valid('BrowserApp'),
      protocol: Joi.string().required().valid('https', 'http'),
      ip: Joi.string().hostname().required(),
      port: Joi.number().port().required(),
      browser: Joi.string().valid(...this.#configSchemaProps.sut._cvtProperties.browser.format).lowercase().default(this.config.get('sut.browser')), // eslint-disable-line no-underscore-dangle
      loggedInIndicator: Joi.string(),
      loggedOutIndicator: Joi.string(),
      context: Joi.object({ // Zap context
        id: Joi.number().integer().positive(), // Provided by Zap.
        name: Joi.string().token() // Created in the app.js model.
      }),
      userId: Joi.number().integer().positive(), // Provided by Zap.
      authentication: Joi.object({
        sitesTreeSutAuthenticationPopulationStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('FormStandard'),
        emissaryAuthenticationStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('FormStandard'),
        route: Joi.string().min(2).regex(/^\/[-?&=\w/]{1,1000}$/),
        usernameFieldLocater: Joi.string().min(2),
        passwordFieldLocater: Joi.string().min(2),
        submit: Joi.string().min(2).regex(/^[a-z0-9_-]+/i),
        expectedPageSourceSuccess: Joi.string().min(2).max(200).required()
      }),
      testSession: Joi.object({
        type: Joi.string().valid('appScanner').required(),
        id: Joi.string().regex(/^\w[-\w]{1,200}$/).required(),
        attributes: Joi.object({
          sitesTreePopulationStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('WebDriverStandard'),
          spiderStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('Standard'),
          scannersStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('BrowserAppStandard'),
          scanningStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('BrowserAppStandard'),
          postScanningStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('BrowserAppStandard'),
          reportingStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('Standard'),
          username: Joi.string().min(2).required(),
          password: Joi.string().min(2),
          aScannerAttackStrength: Joi.string().valid(...this.#configSchemaProps.sut._cvtProperties.aScannerAttackStrength.format).uppercase().default(this.config.get('sut.aScannerAttackStrength')), // eslint-disable-line no-underscore-dangle
          aScannerAlertThreshold: Joi.string().valid(...this.#configSchemaProps.sut._cvtProperties.aScannerAlertThreshold.format).uppercase().default(this.config.get('sut.aScannerAlertThreshold')), // eslint-disable-line no-underscore-dangle
          alertThreshold: Joi.number().integer().min(0).max(1000).default(this.config.get('sut.alertThreshold')),
          excludedRoutes: Joi.array().items(Joi.string()).default([])
        }),
        relationships: Joi.object({
          data: Joi.array().items(Joi.object({
            type: Joi.string().valid('route').required(),
            id: Joi.string().min(2).regex(/^\/[-\w/]{1,200}$/).required()
          }))
        })
      }),
      testRoutes: Joi.array().items(Joi.object({
        type: Joi.string().valid('route').required(),
        id: Joi.string().min(2).regex(/^\/[-\w/]{1,200}$/).required(),
        attributes: Joi.object({
          attackFields: Joi.array().items(Joi.object({
            name: Joi.string().min(1).max(100).regex(/^[a-z0-9._-]+/i).required(),
            value: [Joi.string().empty('').default(''), Joi.boolean(), Joi.number()],
            visible: Joi.boolean()
          })),
          method: Joi.string().valid(...this.#configSchemaProps.sut._cvtProperties.method.format).uppercase().default(this.config.get('sut.method')), // eslint-disable-line no-underscore-dangle
          submit: Joi.string().min(2).regex(/^[a-z0-9_-]+/i)
        })
      }))
    }).xor('loggedInIndicator', 'loggedOutIndicator');
  }

  #selectStrategies() {
    this.#SitesTreeSutAuthenticationPopulation = sitesTreeSutAuthenticationPopulation[this.getProperties('authentication').sitesTreeSutAuthenticationPopulationStrategy];
    super.selectStrategies();
  }

  async initialise(emissaryProperties, selenium) {
    const { knownZapErrorsWithHelpMessageForBuildUser: knownZapFormatStringErrorsWithHelpMessageForBuildUser } = emissaryProperties;
    const webDriverFactory = new WebDriverFactory();
    this.log.debug(`selenium is: ${JSON.stringify(selenium)}`, { tags: [`pid-${process.pid}`, 'sUt.browserApp', 'initialise'] });
    const webDriver = await webDriverFactory.webDriver({
      log: this.log,
      selenium,
      browser: this.properties.browser,
      emissary: emissaryProperties,
      sutProtocol: this.properties.protocol
    });

    const getValuesOfSpecifiedSutPropertiesBasedOnPathAsArray = (pathDef, sutProps) => pathDef.reduce((accum, cV) => ((accum && accum[cV]) ? accum[cV] : null), sutProps);

    const replaceStringSubstitutionsWithSutPropertyValues = (message) => {
      const words = message.split(' ');
      const substitutions = words.filter((w) => w.startsWith('%'));
      const sutPropertyPaths = substitutions.map((w) => w.substring(1));
      const sutPropertyPathsAsArrays = sutPropertyPaths.map((s) => s.split('.'));
      const replacementValues = sutPropertyPathsAsArrays.map((s) => getValuesOfSpecifiedSutPropertiesBasedOnPathAsArray(s, this.properties));
      const wordsWithSubstitutionsReplaced = words.map((z) => (z.startsWith('%') ? replacementValues.shift() : z));
      return wordsWithSubstitutionsReplaced.join(' ');
    };

    const knownZapErrorsWithHelpMessageForBuildUser = knownZapFormatStringErrorsWithHelpMessageForBuildUser
      .map((k) => ({
        zapMessage: replaceStringSubstitutionsWithSutPropertyValues(k.zapMessage),
        helpMessageForBuildUser: replaceStringSubstitutionsWithSutPropertyValues(k.helpMessageForBuildUser)
      }));

    browser.init({ log: this.log, publisher: this.publisher, knownZapErrorsWithHelpMessageForBuildUser, webDriver });
  }

  constructor({ log, publisher, sutProperties }) {
    super({ log, publisher });
    this.#configSchemaProps = this.config.getSchema()._cvtProperties; // eslint-disable-line no-underscore-dangle
    this.#createSchema();
    this.initialiseProperties(sutProperties, this.#sutSchema);
    this.#selectStrategies();
  }

  getSitesTreeSutAuthenticationPopulationStrategy() {
    return {
      Strategy: this.#SitesTreeSutAuthenticationPopulation,
      args: {
        publisher: this.publisher,
        baseUrl: this.baseUrl(),
        browser,
        sutPropertiesSubSet: this.getProperties(['authentication', 'testSession'])
      }
    };
  }

  getSitesTreePopulationStrategy() {
    return {
      ...super.getSitesTreePopulationStrategy(),
      args: {
        publisher: this.publisher,
        baseUrl: this.baseUrl(),
        browser,
        sutPropertiesSubSet: this.getProperties(['testSession', 'context', 'testRoutes']),
        setContextId: (id) => { this.properties.context.id = id; }
      }
    };
  }

  getEmissaryAuthenticationStrategy() {
    return {
      ...super.getEmissaryAuthenticationStrategy(),
      args: {
        log: this.log,
        publisher: this.publisher,
        baseUrl: this.baseUrl(),
        sutPropertiesSubSet: this.getProperties(['authentication', 'loggedInIndicator', 'loggedOutIndicator', 'testSession', 'context']),
        setUserId: (id) => { this.properties.userId = id; }
      }
    };
  }

  getSpiderStrategy() {
    return {
      ...super.getSpiderStrategy(),
      args: {
        publisher: this.publisher,
        baseUrl: this.baseUrl(),
        sutPropertiesSubSet: this.getProperties('testSession')
      }
    };
  }

  getScannersStrategy() {
    return {
      ...super.getScannersStrategy(),
      args: {
        log: this.log,
        publisher: this.publisher,
        baseUrl: this.baseUrl(),
        sutPropertiesSubSet: this.getProperties('testSession')
      }
    };
  }

  getScanningStrategy() {
    return {
      ...super.getScanningStrategy(),
      args: {
        log: this.log,
        publisher: this.publisher,
        baseUrl: this.baseUrl(),
        sutPropertiesSubSet: this.getProperties(['testSession', 'testRoutes', 'context', 'userId'])
      }
    };
  }

  getPostScanningStrategy() {
    return {
      ...super.getPostScanningStrategy(),
      args: {
        publisher: this.publisher,
        baseUrl: this.baseUrl(),
        sutPropertiesSubSet: this.getProperties('testSession')
      }
    };
  }

  getReportingStrategy() {
    return {
      ...super.getReportingStrategy(),
      args: {
        log: this.log,
        publisher: this.publisher,
        sutPropertiesSubSet: this.getProperties('testSession')
      }
    };
  }
}

module.exports = BrowserApp;
