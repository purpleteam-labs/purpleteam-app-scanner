// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

const { setWorldConstructor, setDefaultTimeout } = require('@cucumber/cucumber');

let timeout;

const ParentWorld = require('../world');

class ApiWorld extends ParentWorld {
  constructor({ attach, parameters }) {
    super({ attach, parameters });
    ({ timeout } = parameters.cucumber);
  }

  async initialiseSut() {
    await this.sUt.initialise(this.zAp.getPropertiesForApiSut());
  }
}

setWorldConstructor(ApiWorld);
setDefaultTimeout(timeout);
