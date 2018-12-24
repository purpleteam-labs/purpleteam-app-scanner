const config = require(`${process.cwd()}/config/config`); // eslint-disable-line import/no-dynamic-require
const log = require('purpleteam-logger').init(config.get('logger'));

const messagePublisher = require(`${process.cwd()}/src/publishers/messagePublisher`).init({ log, redis: config.get('redis.clientCreationOptions') }); // eslint-disable-line import/no-dynamic-require
// features/support/world.js
const cucumber = require('cucumber');

const { setWorldConstructor, setDefaultTimeout } = cucumber;

const sut = require(`${process.cwd()}/src/api/app/do/sut`); // eslint-disable-line import/no-dynamic-require
const zap = require(`${process.cwd()}/src/slaves/zap`); // eslint-disable-line import/no-dynamic-require
const strings = require(`${process.cwd()}/src/strings`); // eslint-disable-line import/no-dynamic-require


class CustomWorld {
  constructor({ attach, parameters }) {
    const { seleniumContainerName, sutProperties, sutProperties: { testSession } } = parameters;

    this.log = log;
    this.publisher = messagePublisher;
    this.publisher.pubLog({ testSessionId: testSession.id, logLevel: 'notice', textData: `Constructing the cucumber world for session with id "${testSession.id}".`, tagObj: { tags: ['world'] } });

    this.variable = 0;
    this.attach = attach;

    setDefaultTimeout(parameters.cucumber.timeOut);

    this.selenium = { seleniumContainerName };
    this.sut = sut;
    this.sut.init({ log, publisher: this.publisher, sutProperties });
    this.zap = zap;
    this.zap.init({ log, slaveProperties: { ...parameters.slaveProperties } });
    this.strings = strings;
  }


  async initialiseBrowser() {
    await this.sut.initialiseBrowser(this.zap.getPropertiesForBrowser(), this.selenium.seleniumContainerName);
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
