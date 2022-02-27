// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import Spider from './strategy.js';

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
export default Standard;
