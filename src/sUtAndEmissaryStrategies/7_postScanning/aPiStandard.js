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
