// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import { setWorldConstructor, setDefaultTimeout } from '@cucumber/cucumber';
import ParentWorld from '../world.js';

let timeout;

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
