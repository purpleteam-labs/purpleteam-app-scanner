// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of PurpleTeam.

// PurpleTeam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// PurpleTeam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this PurpleTeam project. If not, see <https://www.gnu.org/licenses/>.

const config = require(`${process.cwd()}/config/config`); // eslint-disable-line import/no-dynamic-require
const log = require('purpleteam-logger').init(config.get('logger'));

const messagePublisher = require(`${process.cwd()}/src/publishers/messagePublisher`).init({ log, redis: config.get('redis.clientCreationOptions') }); // eslint-disable-line import/no-dynamic-require
// features/support/world.js
const { setWorldConstructor, setDefaultTimeout } = require('@cucumber/cucumber');

const sUt = require(`${process.cwd()}/src/api/app/do`); // eslint-disable-line import/no-dynamic-require
const zAp = require(`${process.cwd()}/src/emissaries/zAp`); // eslint-disable-line import/no-dynamic-require

let timeout;

class CustomWorld {
  #sUtType;

  constructor({ attach, parameters }) {
    const { seleniumContainerName, seleniumPort, sutProperties, sutProperties: { sUtType, testSession: { id: testSessionId } } } = parameters;
    this.#sUtType = sUtType;
    this.log = log;
    this.log.debug(`seleniumContainerName is: ${seleniumContainerName}, seleniumPort is: ${seleniumPort}, sutProperties are: ${JSON.stringify(sutProperties)}`, { tags: [`pid-${process.pid}`, 'world'] });
    this.publisher = messagePublisher;
    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Constructing the cucumber world for session with id "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'world'] } });

    this.variable = 0;
    this.attach = attach;

    this.selenium = { seleniumContainerName, seleniumPort };
    this.sUt = new sUt[sUtType]({ log, publisher: this.publisher, sutProperties });
    this.zAp = zAp;
    this.zAp.initialise({ log, publisher: this.publisher, emissaryProperties: { ...parameters.emissaryProperties } });

    timeout = parameters.cucumber.timeout;
  }


  async initialiseSut() {
    await this.sUt.initialise(this.zAp[`getPropertiesFor${this.#sUtType}Sut`](), this.selenium); // selenium only needed for BrowserApp.
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
