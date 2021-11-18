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

class Standard extends PostScanning {
  #sutPropertiesSubSet;
  #fileName = 'standard';

  constructor({ publisher, baseUrl, sutPropertiesSubSet, zAp }) {
    super({ publisher, baseUrl, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
  }

  process() {
    const methodName = 'process';
    const { id: testSessionId, attributes: { alertThreshold }, relationships: { data: testSessionResourceIdentifiers } } = this.#sutPropertiesSubSet;
    const routes = testSessionResourceIdentifiers.filter((resourceIdentifier) => resourceIdentifier.type === 'route').map((resourceIdentifier) => resourceIdentifier.id);

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    const numberOfAlertsForSesh = this.zAp.numberOfAlertsForSesh();

    if (numberOfAlertsForSesh > alertThreshold) {
      // The following message assumes that the Scanning strategy behaves a certain way, so the Standard Scanning and Standard PostScanning are coupled.
      this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Search the generated report for the ${routes.length ? `routes: [${routes}]` : `URL: "${this.baseUrl}"`}, to see the ${numberOfAlertsForSesh - alertThreshold} vulnerabilities that exceed the Build User defined alert threshold of "${alertThreshold}" for the Test Session with id "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
    }

    if (numberOfAlertsForSesh > alertThreshold) throw new Error(`The number of alerts (${numberOfAlertsForSesh}) should be no greater than the alert threshold (${alertThreshold}).`);
  }
}

module.exports = Standard;
