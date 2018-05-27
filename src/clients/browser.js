const { By } = require('selenium-webdriver');
let driver;



const findElementThenClick = async searchText => {
  try {    
    await driver.findElement(By.id(searchText)).click();
    return console.log(`Located element using id="${searchText}", and clicked it.`);    
  } catch(e) {
    console.log(`Unable to locate element using id="${searchText}".`);
  }
  try {
    await driver.findElement(By.className(searchText)).click();
    return console.log(`Located element using className="${searchText}", and clicked it.`);
  } catch(e) {
    console.log(`Unable to locate element using className="${searchText}".`);
  }
  try {
    await driver.findElement(By.name(searchText)).click();
    return console.log(`Located element using name="${searchText}", and clicked it.`);    
  } catch(e) {
    console.log(`Unable to locate element using name="${searchText}".`);
    throw new Error(`Unable to locate element using id, className, or name of "${searchText}".`);
  }
};


const findElementThenSendKeys = async (attackField) => {
  try {
    
    if(attackField && attackField.visible) {
      await driver.findElement(By.id(attackField.name)).sendKeys(attackField.value);
      return console.log(`Located element using id="${attackField.name}", and sent keys.`);
    }
  } catch(e) {
    
    console.log(`Unable to locate element using id="${attackField.name}".`);
  }
  try {
    
    if(attackField && attackField.visible) {
      await driver.findElement(By.className(attackField.name)).sendKeys(attackField.value);
      return console.log(`Located element using className="${attackField.name}", and sent keys.`);
    }
  } catch(e) {
    
    console.log(`Unable to locate element using className="${attackField.name}".`);
  }
  try {
    
    if(attackField && attackField.visible) {
      await driver.findElement(By.name(attackField.name)).sendKeys(attackField.value);
      return console.log(`Located element using name="${attackField.name}", and sent keys.`);
    }
  } catch(e) {
    
    console.log(`Unable to locate element using name="${attackField.name}".`);
    throw new Error(`Unable to locate element using id, className, or name of "${attackField.name}".`);
  }
};


module.exports = {
  findElementThenClick,
  findElementThenSendKeys,
  setWebDriver(webDriver) {
    driver = webDriver;
  },
  getWebDriver() {
    return driver;
  }
};


