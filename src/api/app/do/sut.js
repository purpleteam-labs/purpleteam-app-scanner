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

const Joi = require('joi');

/* eslint-disable import/no-dynamic-require */
const WebDriverFactory = require(`${process.cwd()}/src/drivers/webDriverFactory`);
const browser = require(`${process.cwd()}/src/clients/browser`);
const config = require(`${process.cwd()}/config/config`);
/* eslint-enable import/no-dynamic-require */

const configSchemaProps = config.getSchema()._cvtProperties; // eslint-disable-line no-underscore-dangle

let log;
let publisher;

// Todo: KC: Will need quite a bit of testing around schemas.
const sutSchema = Joi.object({
  protocol: Joi.string().required().valid('https', 'http'),
  ip: Joi.string().hostname().required(),
  port: Joi.number().port().required(),
  browser: Joi.string().valid(...configSchemaProps.sut._cvtProperties.browser.format).lowercase().default(config.get('sut.browser')), // eslint-disable-line no-underscore-dangle
  loggedInIndicator: Joi.string(),
  context: Joi.object({ // Zap context
    iD: Joi.number().integer().positive(),
    name: Joi.string().token()
  }),
  authentication: Joi.object({
    route: Joi.string().min(2).regex(/^\/[a-z]+/i),
    usernameFieldLocater: Joi.string().min(2).required(),
    passwordFieldLocater: Joi.string().min(2).required(),
    submit: Joi.string().min(2).regex(/^[a-z0-9_-]+/i).required(),
    expectedPageSourceSuccess: Joi.string().min(2).max(200).required()
  }),
  reportFormats: Joi.array().items(Joi.string().valid(...configSchemaProps.sut._cvtProperties.reportFormat.format).lowercase()).unique().default([config.get('sut.reportFormat')]), // eslint-disable-line no-underscore-dangle
  testSession: Joi.object({
    type: Joi.string().valid('testSession').required(),
    id: Joi.string().alphanum(),
    attributes: Joi.object({
      username: Joi.string().min(2),
      password: Joi.string().min(2),
      aScannerAttackStrength: Joi.string().valid(...configSchemaProps.sut._cvtProperties.aScannerAttackStrength.format).uppercase().default(config.get('sut.aScannerAttackStrength')), // eslint-disable-line no-underscore-dangle
      aScannerAlertThreshold: Joi.string().valid(...configSchemaProps.sut._cvtProperties.aScannerAlertThreshold.format).uppercase().default(config.get('sut.aScannerAlertThreshold')), // eslint-disable-line no-underscore-dangle
      alertThreshold: Joi.number().integer().positive().default(config.get('sut.alertThreshold'))
    }),
    relationships: Joi.object({
      data: Joi.array().items(Joi.object({
        type: Joi.string().valid('route').required(),
        id: Joi.string().min(2).regex(/^\/[a-z]+/i).required()
      }))
    })
  }),
  testRoutes: Joi.array().items(Joi.object({
    type: Joi.string().valid('route').required(),
    id: Joi.string().min(2).regex(/^\/[a-z]+/i).required(),
    attributes: Joi.object({
      attackFields: Joi.array().items(Joi.object({
        name: Joi.string().min(2).regex(/^[a-z0-9_-]+/i).required(),
        value: Joi.string().empty('').default(''),
        visible: Joi.boolean()
      })),
      method: Joi.string().valid(...configSchemaProps.sut._cvtProperties.method.format).uppercase().default(config.get('sut.method')), // eslint-disable-line no-underscore-dangle
      submit: Joi.string().min(2).regex(/^[a-z0-9_-]+/i)
    })
  }))
});


let properties;
let webDriver;


const validateProperties = (sutProperties) => {
  const result = sutSchema.validate(sutProperties);
  if (result.error) {
    log.error(result.error.message, { tags: ['testing', 'validation'] });
    throw new Error(result.error.message);
  }
  return result.value;
};


const initialiseProperties = (sutProperties) => {
  properties = validateProperties(sutProperties);
};


const init = (options) => {
  ({ log, publisher } = options);
  initialiseProperties(options.sutProperties);
};


const getProperties = (selecter) => {
  if (typeof selecter === 'string') return properties[selecter];
  if (Array.isArray(selecter)) return selecter.reduce((accum, propertyName) => ({ ...accum, [propertyName]: properties[propertyName] }), {});
  return properties;
};


const initialiseBrowser = async (slaveProperties, selenium) => {
  const { knownZapErrorsWithHelpMessageForBuildUser: knownZapFormatStringErrorsWithHelpMessageForBuildUser } = slaveProperties;
  const webDriverFactory = new WebDriverFactory();
  log.debug(`selenium is: ${JSON.stringify(selenium)}`, { tags: [`pid-${process.pid}`, 'sut', 'initialiseBrowser'] });
  webDriver = await webDriverFactory.webDriver({
    log,
    selenium,
    browser: properties.browser,
    slave: slaveProperties,
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

  browser.init({ log, publisher, knownZapErrorsWithHelpMessageForBuildUser, webDriver });
};


module.exports = {
  validateProperties,
  init,
  properties,
  initialiseBrowser,
  getProperties,
  // Zap Spider normalises port if it's a default port based on the protocol/scheme, so if the sut is listening on a default port, we remove it here.
  baseUrl: () => `${properties.protocol}://${properties.ip}${{ http: 80, https: 443 }[properties.protocol] === properties.port ? '' : `:${properties.port}`}`,
  getBrowser: () => browser
};
