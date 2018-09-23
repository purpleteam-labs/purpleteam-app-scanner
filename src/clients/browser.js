const { By } = require('selenium-webdriver');

let publisher;
let driver;


const authenticated = async (expectedLogInResponse) => {
  const { success, fail } = expectedLogInResponse;
  const page = await driver.getPageSource();
  return page.includes(success) || !page.includes(fail);
};


const findElementThenClick = async (searchText, testSessionId, expectedLogInResponse) => {
  const authenticatedFeedback = async () => (expectedLogInResponse ? ` User was ${await authenticated(expectedLogInResponse) ? 'authenticated' : '***not*** authenticated, check the login credentials you supplied in the buildUserConfig'}.` : '');
  try {
    await driver.findElement(By.id(searchText)).click();
    return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using id="${searchText}", and clicked it.${await authenticatedFeedback()}`, tagObj: { tags: ['browser'] } });
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using id="${searchText}".`, tagObj: { tags: ['browser'] } });
  }
  try {
    await driver.findElement(By.className(searchText)).click();
    return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using className="${searchText}", and clicked it.${await authenticatedFeedback()}`, tagObj: { tags: ['browser'] } });
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using className="${searchText}".`, tagObj: { tags: ['browser'] } });
  }
  try {
    await driver.findElement(By.name(searchText)).click();
    return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using name="${searchText}", and clicked it.${await authenticatedFeedback()}`, tagObj: { tags: ['browser'] } });
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using name="${searchText}".`, tagObj: { tags: ['browser'] } });
    publisher.pubLog({ testSessionId, logLevel: 'crit', textData: `Unable to locate element using id, className, or name of "${searchText}".`, tagObj: { tags: ['browser'] } });
    throw new Error(`Unable to locate element using id, className, or name of "${searchText}".`);
  }
};


const findElementThenSendKeys = async (attackField, testSessionId) => {
  try {
    if (attackField && attackField.visible) {
      await driver.findElement(By.id(attackField.name)).sendKeys(attackField.value);
      return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using id="${attackField.name}", and sent keys.`, tagObj: { tags: ['browser'] } });
    }
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using id="${attackField.name}".`, tagObj: { tags: ['browser'] }});
  }
  try {
    if (attackField && attackField.visible) {
      await driver.findElement(By.className(attackField.name)).sendKeys(attackField.value);
      return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using className="${attackField.name}", and sent keys.`, tagObj: { tags: ['browser'] } });
    }
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using className="${attackField.name}".`, tagObj: { tags: ['browser'] } });
  }
  try {
    if (attackField && attackField.visible) {
      await driver.findElement(By.name(attackField.name)).sendKeys(attackField.value);
      return publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Located element using name="${attackField.name}", and sent keys.`, tagObj: { tags: ['browser'] } });
    }
  } catch (e) {
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Unable to locate element using name="${attackField.name}".`, tagObj: { tags: ['browser'] } });
    throw new Error(`Unable to locate element using id, className, or name of "${attackField.name}".`);
  }
  return ''; // Keep eslint happy
};


module.exports = {
  findElementThenClick,
  findElementThenSendKeys,
  init(options) { ({ publisher, webDriver: driver } = options); },
  getWebDriver() {
    return driver;
  }
};
