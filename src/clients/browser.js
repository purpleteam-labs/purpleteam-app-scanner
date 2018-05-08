

let driver;





module.exports = {
  setWebDriver(webDriver) {
    driver = webDriver;
  },
  getWebDriver() {
    return driver;
  }
};