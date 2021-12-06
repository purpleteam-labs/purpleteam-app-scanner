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

const { By, until } = require('selenium-webdriver');

// The three types of wiats in Selenium are:
//   Implicit Wait    Wait for a measure of time before throwing exception (this is a blunt tool).
//   Explicit Wait    Wiat for a condition to occur, but no longer than the specified timeout (most commonly used).
//   Fluent Waits     Maximum wait time (Advanced version of an explicit wait).
// Docs:
//   https://www.testim.io/blog/how-to-wait-for-a-page-to-load-in-selenium/
//   https://www.selenium.dev/documentation/webdriver/waits/#tabs-0-4
//   https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/lib/until.html
const internals = {
  log: undefined,
  publisher: undefined,
  driver: undefined,
  knownZapErrorsWithHelpMessageForBuildUser: undefined,
  explicitTimeout: 10000, // 10 seconds. This is a maximum.
  authenticated: async (expectedPageSourceSuccess) => {
    try {
      return await internals.driver.wait(async () => {
        const page = await internals.driver.getPageSource();
        return page.includes(expectedPageSourceSuccess);
      }, internals.explicitTimeout);
    } catch (err) {
      if (err.name !== 'TimeoutError') throw err;
      return false;
    }
  },
  // Doc:
  //   By.js: https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_By.html
  //   executeScript: https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#executeScript
  // The search function can not be object shorthand.
  search: function () { // eslint-disable-line
    // Selenium requires the use of arguments.
    const searchText = arguments[0]; // eslint-disable-line prefer-rest-params
    const elementById = document.getElementById(searchText); // eslint-disable-line no-undef
    const elementByClassName = document.getElementsByClassName(searchText)[0] || null; // eslint-disable-line no-undef
    const elementByName = document.getElementsByName(searchText)[0] || null; // eslint-disable-line no-undef
    // This could be extended with the likes of querySelector. It would mean that the attackFields in the Job file may need an additional search string.
    return elementById || elementByClassName || elementByName || null;
  }
};

const findElementThenClick = async (searchText, testSessionId, expectedPageSourceSuccess) => {
  const { publisher, driver, explicitTimeout, authenticated, search } = internals;
  const authenticatedFeedback = async () => (expectedPageSourceSuccess ? `. User was ${await authenticated(expectedPageSourceSuccess) ? 'authenticated' : '***not*** authenticated, check the login credentials you supplied in the Job'}` : '');
  try {
    await driver.wait(until.elementLocated(By.js(search, searchText)), explicitTimeout).click();
    return publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Located element for Test Session with id: "${testSessionId}" using searchText: "${searchText}", and clicked it${await authenticatedFeedback()}.`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
  } catch (e) {
    const textData = `Unable to locate element using searchText: "${searchText}" to click for Test Session with id: "${testSessionId}" using the following document methods: getElementById, getElementsByClassName, getElementsByName.`;
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    throw new Error(textData);
  }
};

const findElementThenClear = async (attackField, testSessionId) => {
  const { publisher, driver, explicitTimeout, search } = internals;
  try {
    if (attackField && attackField.visible) {
      await driver.wait(until.elementLocated(By.js(search, attackField.name)), explicitTimeout).clear();
      return publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Located element for Test Session with id: "${testSessionId}" using attackField.name: "${attackField.name}" and cleared it's value.`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    }
  } catch (e) {
    const textData = `Unable to locate element using attackField.name: "${attackField.name}" to clear for Test Session with id: "${testSessionId}" using the following document methods: getElementById, getElementsByClassName, getElementsByName.`;
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    throw new Error(textData);
  }
  return ''; // Keep eslint happy
};

const findElementThenSendKeys = async (attackField, testSessionId) => {
  const { publisher, driver, explicitTimeout, search } = internals;
  try {
    if (attackField && attackField.visible) {
      await driver.wait(until.elementLocated(By.js(search, attackField.name)), explicitTimeout).sendKeys(attackField.value);
      return publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Located element for Test Session with id: "${testSessionId}" using attackField.name: "${attackField.name}" and sent keys.`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    }
  } catch (e) {
    const textData = `Unable to locate element using attackField.name: "${attackField.name}" to send keys for Test Session with id: "${testSessionId}" using the following document methods: getElementById, getElementsByClassName, getElementsByName.`;
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    throw new Error(textData);
  }
  return ''; // Keep eslint happy
};

const checkUserIsAuthenticated = async (testSessionId, expectedPageSourceSuccess) => {
  const { publisher, authenticated } = internals;
  const success = await authenticated(expectedPageSourceSuccess);
  publisher.pubLog({ testSessionId, logLevel: 'info', textData: `For Test Session with id: "${testSessionId}", user was ${success ? '' : '***not*** '}authenticated.`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
};

const checkAndNotifyBuildUserIfAnyKnownBrowserErrors = async (testSessionId) => {
  const { log, publisher, driver, knownZapErrorsWithHelpMessageForBuildUser } = internals;
  try {
    let page;
    const zapError = await driver.wait(async () => {
      page = await driver.getPageSource();
      return page.includes('ZAP Error');
    }, 5000); // 5 seconds.
    if (zapError) {
      const knownZapErrorWithHelpMessageForBuildUser = knownZapErrorsWithHelpMessageForBuildUser.find((k) => page.includes(k.zapMessage));

      if (knownZapErrorWithHelpMessageForBuildUser) {
        publisher.pubLog({ testSessionId, logLevel: 'error', textData: `${knownZapErrorWithHelpMessageForBuildUser.helpMessageForBuildUser} The message received in the browser was: "${knownZapErrorWithHelpMessageForBuildUser.zapMessage}" ... for Test Session id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
      } else {
        const messageForUnknownZapError = `An unknown Zap Error was received in the browser for Test Session id: "${testSessionId}".`;
        log.error(`${messageForUnknownZapError} The page source was: ${page}`, { tags: [`pid-${process.pid}`, 'browser'] });
        publisher.publish(testSessionId, `${messageForUnknownZapError} If running local: inspect the app-scanner log, if running in cloud: Ask @binarymist for further details.`);
      }
    }
  } catch (e) {
    if (e.name !== 'TimeoutError') throw new Error(`Error occurred in browser.js while looking for ZAP Error. The error was: ${e}`);
  }
};

module.exports = {
  findElementThenClick,
  findElementThenClear,
  findElementThenSendKeys,
  checkUserIsAuthenticated,
  checkAndNotifyBuildUserIfAnyKnownBrowserErrors,
  init(options) {
    internals.log = options.log;
    internals.publisher = options.publisher;
    internals.knownZapErrorsWithHelpMessageForBuildUser = options.knownZapErrorsWithHelpMessageForBuildUser;
    internals.driver = options.webDriver;
  },
  getWebDriver() {
    return internals.driver;
  }
};
