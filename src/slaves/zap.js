const Joi = require('joi');
const ZapClient = require('zaproxy');

const config = require(`${process.cwd()}/config/config`); // eslint-disable-line import/no-dynamic-require


const zapSchema = {
  protocol: Joi.string().required().valid('https', 'http'),
  ip: Joi.string().required().ip(),
  port: Joi.number().required().port(),
  apiKey: Joi.string().required(),
  apiFeedbackSpeed: Joi.number().integer().positive(),
  reportDir: Joi.string().required().valid(config.get('slave.report.dir')),
  spider: Joi.object({
    maxDepth: Joi.number().integer().positive(),
    threadCount: Joi.number().integer().min(0).max(20),
    maxChildren: Joi.number().integer().min(0).max(20)
  })
};

let log; // Todo: KC: Should be provided by an IoC container.
let properties;
let zaproxy;
let alertCount;

const validateProperties = (slaveProperties) => {
  const result = Joi.validate(slaveProperties, zapSchema);

  if (result.error) {
    log.error(result.error.message, { tags: ['zap'] });
    throw new Error(result.error.message);
  }
  return result.value;
};


const init = (options) => {
  ({ log } = options);
  properties = validateProperties(options.slaveProperties);

  const zapOptions = {
    apiKey: properties.apiKey,
    proxy: `${properties.protocol}://${properties.ip}:${properties.port}/`
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
  getPropertiesForBrowser: () => getProperties(['protocol', 'ip', 'port']),
  numberOfAlertsForSesh
};
