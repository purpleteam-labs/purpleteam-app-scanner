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


const { setWorldConstructor, setDefaultTimeout } = require('@cucumber/cucumber');

let timeout;

const ParentWorld = require('../world');

class BrowserAppWorld extends ParentWorld {
  constructor({ attach, parameters }) {
    super({ attach, parameters });
    const { seleniumContainerName, seleniumPort, sutProperties } = parameters;
    ({ timeout } = parameters.cucumber);
    this.log.debug(`seleniumContainerName is: ${seleniumContainerName}, seleniumPort is: ${seleniumPort}, sutProperties are: ${JSON.stringify(sutProperties)}`, { tags: [`pid-${process.pid}`, 'world'] });
    this.selenium = { seleniumContainerName, seleniumPort };
  }

  async initialiseSut() {
    await this.sUt.initialise(this.zAp.getPropertiesForBrowserAppSut(), this.selenium);
  }
}

setWorldConstructor(BrowserAppWorld);
setDefaultTimeout(timeout);
