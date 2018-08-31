const { By } = require('selenium-webdriver');

let log; // Todo: KC: Should be provided by an IoC container.
let driver;


const findElementThenClick = async (searchText) => {
  try {
    await driver.findElement(By.id(searchText)).click();
    return log.notice(`Located element using id="${searchText}", and clicked it.`, { tags: ['browser'] });
  } catch (e) {
    log.notice(`Unable to locate element using id="${searchText}".`, { tags: ['browser'] });
  }
  try {
    await driver.findElement(By.className(searchText)).click();
    return log.notice(`Located element using className="${searchText}", and clicked it.`, { tags: ['browser'] });
  } catch (e) {
    log.notice(`Unable to locate element using className="${searchText}".`, { tags: ['browser'] });
  }
  try {
    await driver.findElement(By.name(searchText)).click();
    return log.notice(`Located element using name="${searchText}", and clicked it.`, { tags: ['browser'] });
  } catch (e) {
    log.notice(`Unable to locate element using name="${searchText}".`, { tags: ['browser'] });
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
  throw new Error(`Falsy attackField: (${attackField}) or attackField.visible: (${attackField.visible}) supplied. Both must be truthy.`);
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
