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


const SitesTreeSutAuthenticationPopulation = require('./strategy');

class FormStandard extends SitesTreeSutAuthenticationPopulation {
  #fileName = 'formStandard';

  constructor({ publisher, baseUrl, browser, sutPropertiesSubSet }) {
    super({ publisher, baseUrl, browser, sutPropertiesSubSet });
  }

  async authenticate() {
    const methodName = 'authenticate';
    const { findElementThenClick, findElementThenSendKeys, checkAndNotifyBuildUserIfAnyKnownBrowserErrors } = this.browser;
    const {
      authentication: { route: loginRoute, usernameFieldLocater, passwordFieldLocater, submit, expectedPageSourceSuccess },
      testSession: { id: testSessionId, attributes: { username, password } }
    } = this.sutPropertiesSubSet;

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    const webDriver = this.browser.getWebDriver();
    await webDriver.getWindowHandle();
    await webDriver.get(`${this.baseUrl}${loginRoute}`);
    await checkAndNotifyBuildUserIfAnyKnownBrowserErrors(testSessionId);
    await findElementThenSendKeys({ name: usernameFieldLocater, value: username, visible: true }, testSessionId);
    await findElementThenSendKeys({ name: passwordFieldLocater, value: password, visible: true }, testSessionId);
    await findElementThenClick(submit, testSessionId, expectedPageSourceSuccess);
  }
}

module.exports = FormStandard;
