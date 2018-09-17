const { By } = require('selenium-webdriver');

let log; // Todo: KC: Should be provided by an IoC container.
let driver;


const authenticated = async (expectedLogInResponse) => {
  const { success, fail } = expectedLogInResponse;
  const page = await driver.getPageSource();
  return page.includes(success) || !page.includes(fail);
};


const findElementThenClick = async (searchText, expectedLogInResponse) => {
  const authenticatedFeedback = async () => (expectedLogInResponse ? ` User was ${await authenticated(expectedLogInResponse) ? 'authenticated' : '***not*** authenticated, check the login credentials you supplied in the buildUserConfig'}.` : '');
  try {
    await driver.findElement(By.id(searchText)).click();
    return log.notice(`Located element using id="${searchText}", and clicked it.${await authenticatedFeedback()}`, { tags: ['browser'] });
  } catch (e) {
    log.notice(`Unable to locate element using id="${searchText}".`, { tags: ['browser'] });
  }
  try {
    await driver.findElement(By.className(searchText)).click();
    return log.notice(`Located element using className="${searchText}", and clicked it.${await authenticatedFeedback()}`, { tags: ['browser'] });
  } catch (e) {
    log.notice(`Unable to locate element using className="${searchText}".`, { tags: ['browser'] });
  }
  try {
    await driver.findElement(By.name(searchText)).click();
    return log.notice(`Located element using name="${searchText}", and clicked it.${await authenticatedFeedback()}`, { tags: ['browser'] });
  } catch (e) {
    log.notice(`Unable to locate element using name="${searchText}".`, { tags: ['browser'] });
    log.crit(`Unable to locate element using id, className, or name of "${searchText}".`, { tags: ['browser'] });
    throw new Error(`Unable to locate element using id, className, or name of "${searchText}".`);
  }
};


const findElementThenSendKeys = async (attackField) => {
  try {
    if (attackField && attackField.visible) {
      await driver.findElement(By.id(attackField.name)).sendKeys(attackField.value);
      return log.notice(`Located element using id="${attackField.name}", and sent keys.`, { tags: ['browser'] });
    }
  } catch (e) {
    log.notice(`Unable to locate element using id="${attackField.name}".`, { tags: ['browser'] });
  }
  try {
    if (attackField && attackField.visible) {
      await driver.findElement(By.className(attackField.name)).sendKeys(attackField.value);
      return log.notice(`Located element using className="${attackField.name}", and sent keys.`, { tags: ['browser'] });
    }
  } catch (e) {
    log.notice(`Unable to locate element using className="${attackField.name}".`, { tags: ['browser'] });
  }
  try {
    if (attackField && attackField.visible) {
      await driver.findElement(By.name(attackField.name)).sendKeys(attackField.value);
      return log.notice(`Located element using name="${attackField.name}", and sent keys.`, { tags: ['browser'] });
    }
  } catch (e) {
    log.notice(`Unable to locate element using name="${attackField.name}".`, { tags: ['browser'] });
    throw new Error(`Unable to locate element using id, className, or name of "${attackField.name}".`);
  }
};


module.exports = {
  findElementThenClick,
  findElementThenSendKeys,
  init(options) {
    ({ log } = options);
    driver = options.webDriver;
  },
  getWebDriver() {
    return driver;
  }
};
