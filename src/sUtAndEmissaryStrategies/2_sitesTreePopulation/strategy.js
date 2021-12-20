// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

// Probably BrowserApp only.
class SitesTreePopulation {
  #setContextId;
  #fileName = 'strategy';

  constructor({ publisher, baseUrl, sutPropertiesSubSet, setContextId, zAp }) {
    if (this.constructor === SitesTreePopulation) throw new Error('Abstract classes can\'t be instantiated.');
    this.publisher = publisher;
    this.baseUrl = baseUrl;
    this.sutPropertiesSubSet = sutPropertiesSubSet;
    this.#setContextId = setContextId;
    this.zAp = zAp;
  }

  async setContextIdForSut(testSessionId, contextName) {
    const methodName = 'setContextIdForSut';
    let contextId;
    await this.zAp.aPi.context.newContext({ contextName })
      .then((resp) => {
        contextId = resp.contextId;
        this.#setContextId(contextId);
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Created new Zap context with a contextId of: "${contextId}", correlating with the contextName of: "${contextName}".`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to create a new Zap context using contextName: "${contextName}", message was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    return contextId;
  }

  async populate() {
    throw new Error(`Method "populate()" of ${this.constructor.name} is abstract.`);
  }
}

module.exports = SitesTreePopulation;
