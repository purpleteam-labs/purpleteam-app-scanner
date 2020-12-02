const config = require(`${process.cwd()}/config/config`); // eslint-disable-line import/no-dynamic-require
const log = require('purpleteam-logger').init(config.get('logger'));

const messagePublisher = require(`${process.cwd()}/src/publishers/messagePublisher`).init({ log, redis: config.get('redis.clientCreationOptions') }); // eslint-disable-line import/no-dynamic-require
// features/support/world.js
const { setWorldConstructor, setDefaultTimeout } = require('@cucumber/cucumber');

const sut = require(`${process.cwd()}/src/api/app/do/sut`); // eslint-disable-line import/no-dynamic-require
const zap = require(`${process.cwd()}/src/slaves/zap`); // eslint-disable-line import/no-dynamic-require
const strings = require(`${process.cwd()}/src/strings`); // eslint-disable-line import/no-dynamic-require

let timeout;

class CustomWorld {
  constructor({ attach, parameters }) {
    const { seleniumContainerName, seleniumPort, sutProperties, sutProperties: { testSession } } = parameters;
    this.log = log;
    this.log.debug(`seleniumContainerName is: ${seleniumContainerName}, seleniumPort is: ${seleniumPort}, sutProperties are: ${JSON.stringify(sutProperties)}`, { tags: [`pid-${process.pid}`, 'world'] });
    this.publisher = messagePublisher;
    this.publisher.pubLog({ testSessionId: testSession.id, logLevel: 'notice', textData: `Constructing the cucumber world for session with id "${testSession.id}".`, tagObj: { tags: [`pid-${process.pid}`, 'world'] } });

    this.variable = 0;
    this.attach = attach;

    this.selenium = { seleniumContainerName, seleniumPort };
    this.sut = sut;
    this.sut.init({ log, publisher: this.publisher, sutProperties });
    this.zap = zap;
    this.zap.init({ log, slaveProperties: { ...parameters.slaveProperties } });
    this.strings = strings;

    timeout = parameters.cucumber.timeOut;
  }


  async initialiseBrowser() {
    await this.sut.initialiseBrowser(this.zap.getPropertiesForBrowser(), this.selenium);
  }

  // simple_math related stuff.

  setTo(number) {
    this.variable = number;
  }

  incrementBy(number) {
    this.variable += number;
  }
}

setWorldConstructor(CustomWorld);
setDefaultTimeout(timeout);
