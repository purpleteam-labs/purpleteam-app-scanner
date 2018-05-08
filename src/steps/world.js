// features/support/world.js
const cucumber = require('cucumber');
const { setWorldConstructor, setDefaultTimeout } = cucumber;

const Browser = require('../clients/browser');
const sut = require('../api/app/do/sut');
const zap = require('../slaves/zap');



// Todo: KC: let's make the instance variables private and only accessible via accessors.

// Todo: KC: Move sut stuff into it's own file.
// Todo: KC: Move zap/slave stuff into it's own file.
const ZapClient = require('zaproxy');




class CustomWorld {
  constructor({attach, parameters}) {
    debugger;
    this.variable = 0;
    this.attach = attach;

    setDefaultTimeout(parameters.cucumber.timeOut);

    this.sut = sut;
    this.sut.initialiseProperties(parameters.sutProperties);
    this.zap = zap;
    this.zap.initialiseProperties({ ...parameters.slaveProperties, sut.baseUrl });
  }


  async initialiseBrowser() {
    await this.sut.initialiseBrowser(this.zap.getPropertiesForBrowser());
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





