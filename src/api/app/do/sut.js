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

/* eslint-disable import/no-dynamic-require */
const WebDriverFactory = require(`${process.cwd()}/src/drivers/webDriverFactory`);
const browser = require(`${process.cwd()}/src/clients/browser`);
const config = require(`${process.cwd()}/config/config`);
/* eslint-enable import/no-dynamic-require */

const internals = {
  configSchemaProps: config.getSchema()._cvtProperties, // eslint-disable-line no-underscore-dangle
  log: undefined,
  publisher: undefined,
  properties: undefined,
  webDriver: undefined
};

internals.sutSchema = Joi.object({
  protocol: Joi.string().required().valid('https', 'http'),
  ip: Joi.string().hostname().required(),
  port: Joi.number().port().required(),
  browser: Joi.string().valid(...internals.configSchemaProps.sut._cvtProperties.browser.format).lowercase().default(config.get('sut.browser')), // eslint-disable-line no-underscore-dangle
  loggedInIndicator: Joi.string(),
  context: Joi.object({ // Zap context
    iD: Joi.number().integer().positive(),
    name: Joi.string().token()
  }),
  authentication: Joi.object({
    route: Joi.string().min(2).regex(/^\/[-\\w/]+/i),
    usernameFieldLocater: Joi.string().min(2).required(),
    passwordFieldLocater: Joi.string().min(2).required(),
    submit: Joi.string().min(2).regex(/^[a-z0-9_-]+/i).required(),
    expectedPageSourceSuccess: Joi.string().min(2).max(200).required()
  }),
  testSession: Joi.object({
    type: Joi.string().valid('appScanner').required(),
    id: Joi.string().alphanum().required(),
    attributes: Joi.object({
      username: Joi.string().min(2),
      password: Joi.string().min(2),
      aScannerAttackStrength: Joi.string().valid(...internals.configSchemaProps.sut._cvtProperties.aScannerAttackStrength.format).uppercase().default(config.get('sut.aScannerAttackStrength')), // eslint-disable-line no-underscore-dangle
      aScannerAlertThreshold: Joi.string().valid(...internals.configSchemaProps.sut._cvtProperties.aScannerAlertThreshold.format).uppercase().default(config.get('sut.aScannerAlertThreshold')), // eslint-disable-line no-underscore-dangle
      alertThreshold: Joi.number().integer().min(0).max(1000).default(config.get('sut.alertThreshold'))
    }),
    relationships: Joi.object({
      data: Joi.array().items(Joi.object({
        type: Joi.string().valid('route').required(),
        id: Joi.string().min(2).regex(/^\/[-\\w/]+/i).required()
      }))
    })
  }),
  testRoutes: Joi.array().items(Joi.object({
    type: Joi.string().valid('route').required(),
    id: Joi.string().min(2).regex(/^\/[-\\w/]+/i).required(),
    attributes: Joi.object({
      attackFields: Joi.array().items(Joi.object({
        name: Joi.string().min(2).regex(/^[a-z0-9_-]+/i).required(),
        value: Joi.string().empty('').default(''),
        visible: Joi.boolean()
      })),
      method: Joi.string().valid(...internals.configSchemaProps.sut._cvtProperties.method.format).uppercase().default(config.get('sut.method')), // eslint-disable-line no-underscore-dangle
      submit: Joi.string().min(2).regex(/^[a-z0-9_-]+/i)
    })
  }))
});

const validateProperties = (sutProperties) => {
  const result = internals.sutSchema.validate(sutProperties);
  if (result.error) {
    internals.log.error(result.error.message, { tags: ['sut'] });
    throw new Error(result.error.message);
  }
  return result.value;
};


const initialiseProperties = (sutProperties) => {
  internals.properties = validateProperties(sutProperties);
};

const init = (options) => {
  internals.log = options.log;
  internals.publisher = options.publisher;
  initialiseProperties(options.sutProperties);
};

const getProperties = (selecter) => {
  const { properties } = internals;
  if (typeof selecter === 'string') return properties[selecter];
  if (Array.isArray(selecter)) return selecter.reduce((accum, propertyName) => ({ ...accum, [propertyName]: properties[propertyName] }), {});
  return properties;
};

const initialiseBrowser = async (emissaryProperties, selenium) => {
  const { log, publisher, properties } = internals;
  const { knownZapErrorsWithHelpMessageForBuildUser: knownZapFormatStringErrorsWithHelpMessageForBuildUser } = emissaryProperties;
  const webDriverFactory = new WebDriverFactory();
  log.debug(`selenium is: ${JSON.stringify(selenium)}`, { tags: [`pid-${process.pid}`, 'sut', 'initialiseBrowser'] });
  internals.webDriver = await webDriverFactory.webDriver({
    log,
    selenium,
    browser: properties.browser,
    emissary: emissaryProperties,
    sutProtocol: properties.protocol
  });

  const getValuesOfSpecifiedSutPropertiesBasedOnPathAsArray = (pathDef, sutProps) => pathDef.reduce((accum, cV) => ((accum && accum[cV]) ? accum[cV] : null), sutProps);

  const replaceStringSubstitutionsWithSutPropertyValues = (message) => {
    const words = message.split(' ');
    const substitutions = words.filter((w) => w.startsWith('%'));
    const sutPropertyPaths = substitutions.map((w) => w.substring(1));
    const sutPropertyPathsAsArrays = sutPropertyPaths.map((s) => s.split('.'));
    const replacementValues = sutPropertyPathsAsArrays.map((s) => getValuesOfSpecifiedSutPropertiesBasedOnPathAsArray(s, properties));
    const wordsWithSubstitutionsReplaced = words.map((z) => (z.startsWith('%') ? replacementValues.shift() : z));
    return wordsWithSubstitutionsReplaced.join(' ');
  };

  const knownZapErrorsWithHelpMessageForBuildUser = knownZapFormatStringErrorsWithHelpMessageForBuildUser
    .map((k) => ({
      zapMessage: replaceStringSubstitutionsWithSutPropertyValues(k.zapMessage),
      helpMessageForBuildUser: replaceStringSubstitutionsWithSutPropertyValues(k.helpMessageForBuildUser)
    }));

  browser.init({ log, publisher, knownZapErrorsWithHelpMessageForBuildUser, webDriver: internals.webDriver });
};


module.exports = {
  init,
  initialiseBrowser,
  getProperties,
  // Zap Spider normalises port if it's a default port based on the protocol/scheme, so if the sut is listening on a default port, we remove it here.
  baseUrl: () => `${internals.properties.protocol}://${internals.properties.ip}${{ http: 80, https: 443 }[internals.properties.protocol] === internals.properties.port ? '' : `:${internals.properties.port}`}`,
  getBrowser: () => browser
};
