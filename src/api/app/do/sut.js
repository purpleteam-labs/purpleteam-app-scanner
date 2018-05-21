const Joi = require('joi');
const WebDriverFactory = require('src/drivers/webDriverFactory');
const browser = require('src/clients/browser');
const config = require('config/config');

// Todo: KC: Will need quite a bit of testing around schemas.
const sutSchema = {

  protocol: Joi.string().required().valid('https', 'http'),
  ip: Joi.string().ip().required(),
  port: Joi.number().port().required(),
  browser: Joi.string().valid(config.getSchema().properties.sut.properties.browser.format).lowercase().default(config.get('sut.browser')),
  loggedInIndicator: Joi.string(),
  context: Joi.object({
    iD: Joi.number().integer().positive(),
    name: Joi.string().token()
  }),
  authentication: Joi.object({
    route: Joi.string().min(2).regex(/^\/[a-z]+/),
    usernameFieldLocater: Joi.string().min(2).required(),
    passwordFieldLocater: Joi.string().min(2).required(),
    username: Joi.string().min(2).required(),
    password: Joi.string().min(2).required()
  }),
  reportFormats: Joi.array().items(Joi.string().valid(config.getSchema().properties.sut.properties.reportFormat.format).lowercase()).unique().default([config.get('sut.reportFormat')]),
  testSessionId: Joi.string(),
  testRoute: Joi.string().min(2).regex(/^\/[a-z]+/),
  routeAttributes: Joi.object({
    aScannerAttackStrength: Joi.string().valid(config.getSchema().properties.sut.properties.aScannerAttackStrength.format).uppercase().default(config.get('sut.aScannerAttackStrength')),
    aScannerAlertThreshold: Joi.string().valid(config.getSchema().properties.sut.properties.aScannerAlertThreshold.format).uppercase().default(config.get('sut.aScannerAlertThreshold')),
    // Todo: KC: Test the default.
    alertThreshold: Joi.number().integer().positive().default(0),
    attackFields: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      value: Joi.string()
    })),
    method: Joi.string().valid(config.getSchema().properties.sut.properties.method.format).uppercase().default(config.get('sut.method')),
    submit: Joi.string()
  })
};


let properties;
let webDriver;


const validateProperties = (sutProperties) => {
  const result = Joi.validate(sutProperties, sutSchema);
  if(result.error) {
    console.log(result.error.message);
    throw new Error(result.error.message);
  }
  return result.value;
};


const initialiseProperties = (sutProperties) => {
  properties = validateProperties(sutProperties);  
};


const getProperties = (selecter) => {
  if(!selecter)
    return properties;
  if(typeof selecter === 'string')
    return properties[selecter];
  if(Array.isArray(selecter))
    return selecter.reduce( (accumulator, propertyName) => ({ ...accumulator, [propertyName]: properties[propertyName] }), {});  
};


const initialiseBrowser = async (slaveProperties) => {
  const webDriverFactory = new WebDriverFactory();

  webDriver = await webDriverFactory.webDriver({
    browser: properties.browser,
    slave: slaveProperties
  });

  browser.setWebDriver(webDriver);
};


module.exports = {
  validateProperties,
  initialiseProperties,
  properties,
  initialiseBrowser,
  getProperties,
  baseUrl: () => `${properties.protocol}://${properties.ip}:${properties.port}`,
  getBrowser: () => browser
};
