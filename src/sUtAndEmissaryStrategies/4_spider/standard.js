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


const Spider = require('./strategy');

class Standard extends Spider {
  #sutPropertiesSubSet;
  #emissaryPropertiesSubSet;
  #fileName = 'standard';

  constructor({ publisher, baseUrl, sutPropertiesSubSet, emissaryPropertiesSubSet, zAp }) {
    super({ publisher, baseUrl, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
  }
  /* eslint-disable */
  async scan() {
    const methodName = 'scan';
    const { id: testSessionId } = this.#sutPropertiesSubSet;
    const { maxChildren } = this.#emissaryPropertiesSubSet;
    const recurse = true;

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    // This is currently taken care of in the Scanning strategy.
    // await this.zAp.aPi.spider.scan({ url: this.baseUrl, maxChildren, recurse })
    //   .then((resp) => {
    //     this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Spider scan initiated for: "${this.baseUrl}", with maxChildren: "${maxChildren}" and recurse set to: "${recurse}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
    //   })
    //   .catch((err) => {
    //     const errorText = `Error occurred while attempting to initiate spider scan for "${this.baseUrl}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
    //     this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
    //     throw new Error(errorText);
    //   });
  }
}
/* eslint-enable */
module.exports = Standard;
