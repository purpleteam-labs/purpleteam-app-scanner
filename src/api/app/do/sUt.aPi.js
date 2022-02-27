// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import Joi from 'joi';
import Sut from './sUt.js';

// Strategies.
// ...

class Api extends Sut {
  #configSchemaProps;
  #sutSchema;
  // Strategies specific to Api.
  // ...

  #createSchema() {
    this.#sutSchema = Joi.object({
      sUtType: Joi.string().required().valid('Api'),
      protocol: Joi.string().required().valid('https', 'http'),
      ip: Joi.string().hostname().required(),
      port: Joi.number().port().required(),
      // eslint-disable-next-line no-underscore-dangle
      browser: Joi.string().valid(...this.#configSchemaProps.sut._cvtProperties.browser.format).lowercase().default(this.config.get('sut.browser')), // Todo: Remove once selenium containers are removed.
      loggedInIndicator: Joi.string(),
      loggedOutIndicator: Joi.string(),
      context: Joi.object({ // Zap context
        id: Joi.number().integer().positive(), // Provided by Zap.
        name: Joi.string().token() // Created in the app.js model.
      }),
      userId: Joi.number().integer().positive(), // Provided by Zap.
      authentication: Joi.object({
        emissaryAuthenticationStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('MaintainJwt'),
        route: Joi.string().min(2).regex(/^\/[-?&=\w/]{1,1000}$/)
      }),
      testSession: Joi.object({
        type: Joi.string().valid('appScanner').required(),
        id: Joi.string().regex(/^\w[-\w]{1,200}$/).required(),
        attributes: Joi.object({
          sitesTreePopulationStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('ImportUrls'),
          spiderStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('Standard'),
          scannersStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('ApiStandard'),
          scanningStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('ApiStandard'),
          postScanningStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('ApiStandard'),
          reportingStrategy: Joi.string().min(2).regex(/^[-\w/]{1,200}$/).default('Standard'),
          reports: Joi.object({ templateThemes: Joi.array().items(Joi.object({ name: Joi.string().min(1).max(100).regex(/^[a-z0-9]+/i).required() })).required() }),
          username: Joi.string().min(2).required(),
          openApi: Joi.object({
            importFileContentBase64: Joi.string().base64({ paddingRequired: true }),
            importUrl: Joi.string().uri({ scheme: ['https', 'http'], domain: { allowUnicode: false } })
          }).xor('importFileContentBase64', 'importUrl'),
          soap: Joi.object({
            importFileContentBase64: Joi.string().base64({ paddingRequired: true }),
            importUrl: Joi.string().uri({ scheme: ['https', 'http'], domain: { allowUnicode: false } })
          }).xor('importFileContentBase64', 'importUrl'),
          graphQl: Joi.object({
            importFileContentBase64: Joi.string().base64({ paddingRequired: true }),
            importUrl: Joi.string().uri({ scheme: ['https', 'http'], domain: { allowUnicode: false } }),
            maxQueryDepth: Joi.number().integer().positive(), // Zaproxy default: 5
            maxArgsDepth: Joi.number().integer().positive(), // Zaproxy default: 5
            optionalArgsEnabled: Joi.boolean().default(true), // Zaproxy default: true
            argsType: Joi.string().valid('INLINE', 'VARIABLES', 'BOTH'), // Zaproxy default: 'BOTH'
            querySplitType: Joi.string().valid('LEAF', 'ROOT_FIELD', 'OPERATION'), // Zaproxy default: 'LEAF'
            requestMethod: Joi.string().valid('POST_JSON', 'POST_GRAPHQL', 'GET') // Zaproxy default: 'POST_JSON'
          }).xor('importFileContentBase64', 'importUrl'),
          importUrls: Joi.object({ importFileContentBase64: Joi.string().base64({ paddingRequired: true }).required() }),
          aScannerAttackStrength: Joi.string().valid(...this.#configSchemaProps.sut._cvtProperties.aScannerAttackStrength.format).uppercase().default(this.config.get('sut.aScannerAttackStrength')), // eslint-disable-line no-underscore-dangle
          aScannerAlertThreshold: Joi.string().valid(...this.#configSchemaProps.sut._cvtProperties.aScannerAlertThreshold.format).uppercase().default(this.config.get('sut.aScannerAlertThreshold')), // eslint-disable-line no-underscore-dangle
          alertThreshold: Joi.number().integer().min(0).max(1000).default(this.config.get('sut.alertThreshold')),
          excludedRoutes: Joi.array().items(Joi.string()).default([])
        }).xor('openApi', 'graphQl', 'soap', 'importUrls')
      })
    }).xor('loggedInIndicator', 'loggedOutIndicator');
  }

  async #selectStrategies() {
    super.selectStrategies();
  }

  async initialise() { // eslint-disable-line class-methods-use-this
    // Todo: Populate as required.
  }

  constructor({ log, publisher, sutProperties }) {
    super({ log, publisher });
    this.#configSchemaProps = this.config.getSchema()._cvtProperties; // eslint-disable-line no-underscore-dangle
    this.#createSchema();
    this.initialiseProperties(sutProperties, this.#sutSchema);
    this.#selectStrategies();
  }

  getSitesTreeSutAuthenticationPopulationStrategy() {
    throw new Error(`Method "getSitesTreeSutAuthenticationPopulationStrategy()" is not applicable to SUT ${this.constructor.name}'s'`);
  }

  getSitesTreePopulationStrategy() {
    return {
      ...super.getSitesTreePopulationStrategy(),
      args: {
        log: this.log,
        publisher: this.publisher,
        baseUrl: this.baseUrl(),
        sutPropertiesSubSet: this.getProperties(['testSession', 'context']),
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
        sutPropertiesSubSet: this.getProperties(['testSession', 'context', 'userId'])
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
        baseUrl: this.baseUrl(),
        sutPropertiesSubSet: this.getProperties(['testSession', 'context'])
      }
    };
  }
}

export default Api;
