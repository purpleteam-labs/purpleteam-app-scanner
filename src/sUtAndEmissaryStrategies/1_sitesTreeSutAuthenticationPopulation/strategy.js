// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

// Probably BrowserApp only.
class SitesTreeSutAuthenticationPopulation {
  constructor({ publisher, baseUrl, browser, sutPropertiesSubSet }) {
    if (this.constructor === SitesTreeSutAuthenticationPopulation) throw new Error('Abstract classes can\'t be instantiated.');
    this.publisher = publisher;
    this.baseUrl = baseUrl;
    this.browser = browser;
    this.sutPropertiesSubSet = sutPropertiesSubSet;
  }

  async authenticate() {
    throw new Error(`Method "authenticate()" of ${this.constructor.name} is abstract.`);
  }
}

module.exports = SitesTreeSutAuthenticationPopulation;
