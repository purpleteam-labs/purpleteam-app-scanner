// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import SitesTreePopulation from './strategy.js';

class WebDriverStandard extends SitesTreePopulation {
  #browser;
  #fileName = 'webDriverStandard';

  constructor({ publisher, baseUrl, browser, sutPropertiesSubSet, setContextId, zAp }) {
    super({ publisher, baseUrl, sutPropertiesSubSet, setContextId, zAp });
    this.#browser = browser;
  }

  async populate() {
    const methodName = 'populate';
    const { findElementThenClick, findElementThenClear, findElementThenSendKeys } = this.#browser;
    const {
      testSession: { id: testSessionId, relationships: { data: testSessionResourceIdentifiers } },
      context: { name: contextName },
      testRoutes: routeResourceObjects
    } = this.sutPropertiesSubSet;
    const routes = testSessionResourceIdentifiers.filter((resourceIdentifier) => resourceIdentifier.type === 'route').map((resourceIdentifier) => resourceIdentifier.id);
    const routeResourceObjectsOfSession = routeResourceObjects.filter((routeResourceObject) => routes.includes(routeResourceObject.id));
    const webDriver = this.#browser.getWebDriver();

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    await this.setContextIdForSut(testSessionId, contextName);

    await routeResourceObjectsOfSession.reduce(async (accum, routeResourceObject) => {
      await accum;

      await webDriver.sleep(1000)
        .then(() => {
          this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Navigating route id "${routeResourceObject.id}" of Test Session id "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } }); // Todo: Test this
          return webDriver.get(`${this.baseUrl}${routeResourceObject.id}`);
        })
        .then(() => webDriver.sleep(1000))
        .then(() => Promise.all(routeResourceObject.attributes.attackFields.map((attackField) => findElementThenClear(attackField, testSessionId))))
        .then(() => Promise.all(routeResourceObject.attributes.attackFields.map((attackField) => findElementThenSendKeys(attackField, testSessionId))))
        .then(() => findElementThenClick(routeResourceObject.attributes.submit, testSessionId))
        .then(() => webDriver.sleep(1000))
        .catch((err) => {
          this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: err.message, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
          throw new Error(`Error occurred while navigating route "${routeResourceObject.id}" of testSession with id "${testSessionId}". The error was: ${err}`);
        });

      return [...(await accum), routeResourceObject];
    }, []);
  }
}

export default WebDriverStandard;
