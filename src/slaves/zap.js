const Joi = require('joi');
const ZapClient = require('zaproxy');

const config = require(`${process.cwd()}/config/config`); // eslint-disable-line import/no-dynamic-require


const zapSchema = Joi.object({
  protocol: Joi.string().required().valid('https', 'http'),
  hostname: Joi.string().required(),
  port: Joi.number().required().port(),
  apiKey: Joi.string().required(),
  apiFeedbackSpeed: Joi.number().integer().positive(),
  reportDir: Joi.string().required().valid(config.get('slave.report.dir')),
  spider: Joi.object({
    maxDepth: Joi.number().integer().positive(),
    threadCount: Joi.number().integer().min(0).max(20),
    maxChildren: Joi.number().integer().min(0).max(20)
  })
});

let log; // Todo: KC: Should be provided by an IoC container.
let properties;
let zaproxy;
let alertCount;

// String substitutions (Ex: %ip ) are replaced in sut.js
// String substitutions must be in the format %sut[[.property].path] preceded immediately and followed immediately by a space
//   unless it's the first or last word in the message.
// Multiple string substitutions are Allowed.
// Array elements can also be substituted. Ex: %testRoutes.1.attributes.attackFields.0.value
const knownZapErrorsWithHelpMessageForBuildUser = [
  {
    zapMessage: 'ZAP Error [java.net.UnknownHostException]: %ip', // Notice the space before the '%'
    helpMessageForBuildUser: 'Are you sure you specified the correct sutIp ( %ip ) in your build user config and that the sutIp you are targeting is in fact up?' // Notice the space immediately before the '%' and immediately after the substitution.
  }
  // ,{ More errors with help messages... as we find out about them }
];

const validateProperties = (slaveProperties) => {
  const result = zapSchema.validate(slaveProperties);
  // log.debug(`result: ${JSON.stringify(result)}`);
  if (result.error) {
    log.error(result.error.message, { tags: ['zap'] });
    throw new Error(result.error.message);
  }
  return result.value;
};


const init = (options) => {
  ({ log } = options);
  properties = { knownZapErrorsWithHelpMessageForBuildUser, ...validateProperties(options.slaveProperties) };

  const zapOptions = {
    apiKey: properties.apiKey,
    proxy: `${properties.protocol}://${properties.hostname}:${properties.port}/`
  };

  zaproxy = new ZapClient(zapOptions);
};


const getProperties = (selecter) => {
  if (typeof selecter === 'string') return properties[selecter];
  if (Array.isArray(selecter)) return selecter.reduce((accum, propertyName) => ({ ...accum, [propertyName]: properties[propertyName] }), {});
  return properties;
};

// eslint-disable-next-line consistent-return
const numberOfAlertsForSesh = (alertCnt) => {
  if (alertCnt) alertCount = alertCnt;
  else return alertCount;
};


module.exports = {
  validateProperties,
  init,
  getProperties,
  getZaproxy: () => zaproxy,
  getPropertiesForBrowser: () => getProperties(['protocol', 'hostname', 'port', 'knownZapErrorsWithHelpMessageForBuildUser']),
  numberOfAlertsForSesh
};
