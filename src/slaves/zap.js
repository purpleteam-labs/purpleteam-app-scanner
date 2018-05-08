const Joi = require('joi');
const ZapClient = require('zaproxy');
const config = require('../../config/config');


const zapSchema = {
  protocol: Joi.string().required().valid('https', 'http'),
  ip: Joi.string().required().ip(),
  port: Joi.number().required().port(),
  apiKey: Joi.string().required(),
  apiFeedbackSpeed: Joi.number().integer().positive(),
  reportDir: Joi.string().required().valid(config.get('slave.report.dir')),
  sutBaseUrl: Joi.string().uri()
};


let properties;
let zaproxy;

const validateProperties = (slaveProperties) => {
  const result = Joi.validate(slaveProperties, zapSchema)
  debugger;
  if(result.error) throw result;
};


const initialiseProperties = (slaveProperties) => {
  validateProperties(slaveProperties);
  properties = slaveProperties;

  const zapOptions = {
    proxy: `${properties.protocol}://${properties.ip}:${properties.port}/`,
    targetApp: properties.subBaseUrl
  };

  zaproxy = new ZapClient(zapOptions);
};


const getProperties = (selecter) => {
  if(!selecter)
    return properties;
  if(typeof selecter === 'string')
    return properties[selecter];
  if(Array.isArray(selecter))
    return selecter.reduce((accumulator, propertyName) => ({ ...accumulator, [propertyName]: properties[propertyName]}), {});  
};


module.exports = {
  validateProperties,
  initialiseProperties,
  getProperties,
  getZaproxy: () => zaproxy,
  getPropertiesForBrowser: () => getProperties(['protocol', 'ip', 'port'])
};