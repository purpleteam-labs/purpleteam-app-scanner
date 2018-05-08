const Joi = require('joi');
const WebDriveFactory = require('../../../drivers/webDriverFactory');
const browser = require('../../../clients/browser');



let browser; 
let webDriver;


// Todo: KC: Will need quite a bit of testing around schemas.
const sutSchema = {
  protocol: Joi.string().required().valid('https', 'http'),
  ip: Joi.string().required().ip(),
  port: Joi.number().required().port(),
  browser: Joi.string().required().valid("chrome", "firefox"),
  sutAuthentication: Joi.object({
    route: Joi.string().min(2).regex(^\/[a-z]+),
    usernameFieldLocater: Joi.string().min(2).required(),
    passwordFieldLocater: Joi.string().min(2).required(),
    username: Joi.string().min(2).required(),
    password: Joi.string().min(2).required()
  }),
  route: Joi.string().min(2).regex(^\/[a-z]+),
  routeFields: Joi.object({
    alertThreshold: Joi.number().integer().positive(),
    attackFields: Joi.array().items(Joi.object({
      name: Joi.string().required()
      value: Joi.string()
    })),
    submit: Joi.string()
  })
};


let properties;



const validateProperties = (sutProperties) => {
  if(Joi.validate(sutProperties, sutSchema).error)
    throw result;
};


const initialiseProperties = (sutProperties) => {
  validateProperties(sutProperties);

  properties = sutProperties;


};


const getProperties = (selecter) => {
  if(!selecter)
    return properties;
  if(typeof selecter === 'string')
    return properties[selecter];
  if(Array.isArray(selecter))
    return selecter.reduce((accumulator, propertyName) => ({ ...accumulator, [propertyName]: properties[propertyName]}), {});  
};


const baseUrl = () => {
  return `${sut.protocol}://${sut.ip}:${sut.port}`;

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
  baseUrl,
  initialiseBrowser,
  getBrowser,
  getProperties
};