const Joi = require('joi');
const ZapClient = require('zaproxy');
const config = require(`${process.cwd()}/config/config`);


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
  }),
  sutBaseUrl: Joi.string().uri()
};

let log;
let properties;
let zaproxy;
let alertCount;

const validateProperties = (slaveProperties) => {

  const result = Joi.validate(slaveProperties, zapSchema);

  if(result.error) {
    log.error(result.error.message, {tags: ['zap']});
    throw new Error(result.error.message);
  }
  return result.value;
};


const init = (options) => {
  log = options.log;
  properties = validateProperties(options.slaveProperties);
  
  const zapOptions = {
    proxy: `${properties.protocol}://${properties.ip}:${properties.port}/`,
    targetApp: properties.sutBaseUrl
  };

  zaproxy = new ZapClient(zapOptions);
};


const getProperties = (selecter) => {
  if(!selecter)
    return properties;
  if(typeof selecter === 'string')
    return properties[selecter];
  if(Array.isArray(selecter))
    return selecter.reduce((accumulator, propertyName) => ({ ...accumulator, [propertyName]: properties[propertyName] }), {});  
};


const numberOfAlertsForSesh = (alertCnt) => {
  if(alertCnt)
    alertCount = alertCnt;
  else
    return alertCount;
};


module.exports = {
  validateProperties,
  init,
  getProperties,
  getZaproxy: () => zaproxy,
  getPropertiesForBrowser: () => getProperties(['protocol', 'ip', 'port']),
  numberOfAlertsForSesh
};