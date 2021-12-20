// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

const PostScanning = require('./strategy');

class ApiStandard extends PostScanning {
  #sutPropertiesSubSet;
  #fileName = 'aPiStandard';

  constructor({ publisher, baseUrl, sutPropertiesSubSet, zAp }) {
    super({ publisher, baseUrl, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
  }

  process() {
    const methodName = 'process';
    const { id: testSessionId, attributes: { alertThreshold } } = this.#sutPropertiesSubSet;

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    const numberOfAlertsForSesh = this.zAp.numberOfAlertsForSesh();

    if (numberOfAlertsForSesh > alertThreshold) {
      // The following message assumes that the Scanning strategy behaves a certain way, so the ApiStandard Scanning and ApiStandard PostScanning are coupled.
      this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `This Test Run failed with: "${numberOfAlertsForSesh - alertThreshold}" vulnerabilities that exceeded the Build User defined alert threshold of: "${alertThreshold}" for the Test Session with id: "${testSessionId}". View the generated report for all alerts.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      throw new Error(`The number of alerts (${numberOfAlertsForSesh}) should be no greater than the alert threshold (${alertThreshold}).`);
    }
    this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: 'Well done, this Test Session passed!', tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
  }
}

module.exports = ApiStandard;
