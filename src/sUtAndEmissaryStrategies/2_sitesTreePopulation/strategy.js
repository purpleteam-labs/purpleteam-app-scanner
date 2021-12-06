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
