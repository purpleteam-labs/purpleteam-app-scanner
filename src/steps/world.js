// features/support/world.js
const cucumber = require('cucumber');
const { setWorldConstructor, setDefaultTimeout } = cucumber;
const Browser = require('../api/app/clients/browser');
const WebDriveFactory = require('../api/app/drivers/webDriverFactory');



// Todo: KC: let's make the instance variables private and only accessible via accessors.

// Todo: KC: Move sut stuff into it's own file.
// Todo: KC: Move zap/slave stuff into it's own file.
const ZapClient = require('zaproxy');




class CustomWorld {
  constructor({attach, parameters}) {
    debugger;
    this.variable = 0;
    this.attach = attach;
    this.parameters = parameters;
    this.testJob = parameters.testJob;
    this.sutBaseUrl = `${parameters.testJob.data.attributes.sutProtocol}${parameters.testJob.data.attributes.sutIp}:${parameters.testJob.data.attributes.sutPort}`;
    this.slave = parameters.slave;

    this.webDriver = await (new WebDriverFactory().webDriver({
        browserName: this.testJob.data.attributes.browser[0],
        slave: this.parameters.slave
      }
    ));
 
    this.browser = new Browser(this.WebDriver);

    setDefaultTimeout(parameters.cucumber.timeOut);

    const zapOptions = {
      proxy: (`${parameters.slave.protocol}${config.get('slave.iP')}:${config.get('slave.port')}/`),
      targetApp: this.sutBaseUrl
    };

    this.zaproxy = new ZapClient(zapOptions);

    this.testSlave = { ...parameters.slave, zaproxy: this.zaproxy };


  }

  getWebDriver() {
    return this.webDriver;
  }

  getSutBaseUrl() {
    return this.sutBaseUrl;
  }

  getSutRoutes() {
    // Todo: KC: This needs to be more extensible and do more cvhecking. It'll also only work for one case currently (profile route with low priv user).
    return [this.testJob.data.included[0].relationships.data[0].id];
  }

  // Todo: KC: Needs to take the route name.
  getSutRouteFields() {
    // Todo: KC: That's right, hard coding the index will need some work.
    return  this.testJob.data.included[2].attributes;
  }

  getTestSlave() {
    return this.testSlave;
  }

  getSutAuthentication() {
    return this.testJob.data.attributes.sutAuthentication;
  }


  // simple_math related stuff.

  setTo(number) {
    this.variable = number
  }

  incrementBy(number) {
    this.variable += number
  }
}

setWorldConstructor(CustomWorld)





