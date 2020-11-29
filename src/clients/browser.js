const { By } = require('selenium-webdriver');

let log;
let publisher;
let driver;
let knownZapErrorsWithHelpMessageForBuildUser;


const authenticated = async (expectedPageSourceSuccess) => {
  const page = await driver.getPageSource();
  return page.includes(expectedPageSourceSuccess);
};


const findElementThenClick = async (searchText, testSessionId, expectedPageSourceSuccess) => {
  const authenticatedFeedback = async () => (expectedPageSourceSuccess ? `. User was ${await authenticated(expectedPageSourceSuccess) ? 'authenticated' : '***not*** authenticated, check the login credentials you supplied in the buildUserConfig'}` : '');
  try {
    await driver.findElement(By.id(searchText)).click();
    return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using id="${searchText}", and clicked it${await authenticatedFeedback()} for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using id="${searchText}" for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
  }
  try {
    await driver.findElement(By.className(searchText)).click();
    return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using className="${searchText}", and clicked it${await authenticatedFeedback()} for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using className="${searchText}" for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
  }
  try {
    await driver.findElement(By.name(searchText)).click();
    return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using name="${searchText}", and clicked it${await authenticatedFeedback()} for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
  } catch (e) {
    const logText = `Unable to locate element using id, className, or name of "${searchText}" for test session with id: "${testSessionId}".`;
    publisher.pubLog({ testSessionId, logLevel: 'crit', textData: `Unable to locate element using id, className, or name of "${searchText}" for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    throw new Error(logText);
  }
};


const findElementThenClear = async (attackField, testSessionId) => {
  try {
    if (attackField && attackField.visible) {
      await driver.findElement(By.id(attackField.name)).clear();
      return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using id="${attackField.name}" and cleared it's value for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    }
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using id="${attackField.name}" to clear it's value for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
  }
  try {
    if (attackField && attackField.visible) {
      await driver.findElement(By.className(attackField.name)).clear();
      return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using className="${attackField.name}" and cleared it's value for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    }
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using className="${attackField.name}" to clear it's value for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
  }
  try {
    if (attackField && attackField.visible) {
      await driver.findElement(By.name(attackField.name)).clear();
      return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using name="${attackField.name}" and cleared it's value for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    }
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using name="${attackField.name}" to clear it's value for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    throw new Error(`Unable to locate element using id, className, or name of "${attackField.name}". For test session with id: "${testSessionId}".`);
  }
  return ''; // Keep eslint happy
};


const findElementThenSendKeys = async (attackField, testSessionId) => {
  try {
    if (attackField && attackField.visible) {
      await driver.findElement(By.id(attackField.name)).sendKeys(attackField.value);
      return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using id="${attackField.name}" and sent keys for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    }
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using id="${attackField.name}" for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
  }
  try {
    if (attackField && attackField.visible) {
      await driver.findElement(By.className(attackField.name)).sendKeys(attackField.value);
      return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using className="${attackField.name}" and sent keys for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    }
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using className="${attackField.name}" for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
  }
  try {
    if (attackField && attackField.visible) {
      await driver.findElement(By.name(attackField.name)).sendKeys(attackField.value);
      return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using name="${attackField.name}" and sent keys for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    }
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using name="${attackField.name}" for test session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    throw new Error(`Unable to locate element using id, className, or name of "${attackField.name}". For test session with id: "${testSessionId}".`);
  }
  return ''; // Keep eslint happy
};


const checkAndNotifyBuildUserIfAnyKnownBrowserErrors = async (testSessionId) => {
  const pageSource = await driver.getPageSource();

  if (pageSource.includes('ZAP Error')) {
    const knownZapErrorWithHelpMessageForBuildUser = knownZapErrorsWithHelpMessageForBuildUser.find((k) => pageSource.includes(k.zapMessage));

    if (knownZapErrorWithHelpMessageForBuildUser) {
      publisher.pubLog({ testSessionId, logLevel: 'error', textData: `${knownZapErrorWithHelpMessageForBuildUser.helpMessageForBuildUser} The message received in the browser was: "${knownZapErrorWithHelpMessageForBuildUser.zapMessage}" ... for test session id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'browser'] } });
    } else {
      const messageForUnknownZapError = `An unknown Zap Error was received in the browser for test session id: "${testSessionId}".`;
      log.error(`${messageForUnknownZapError} The page source was: ${pageSource}`, { tags: [`pid-${process.pid}`, 'browser'] });
      publisher.publish(testSessionId, `${messageForUnknownZapError} If running local: inspect the app-scanner log, if running in cloud: Ask @binarymist for further details.`);
    }
  }
};


const percentEncode = (str) => str.split('').map((char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`).reduce((accum, cV) => `${accum}${cV}`, '');


module.exports = {
  findElementThenClick,
  findElementThenClear,
  findElementThenSendKeys,
  checkAndNotifyBuildUserIfAnyKnownBrowserErrors,
  init(options) {
    ({ log, publisher, knownZapErrorsWithHelpMessageForBuildUser, webDriver: driver } = options);
  },
  getWebDriver() {
    return driver;
  },
  percentEncode
};
