const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
// Todo: KC: provide support for the other web drivers.
const firefox = require('selenium-webdriver/firefox');

const seleniumWebdriver = require('selenium-webdriver');

const proxy = require('selenium-webdriver/proxy');

let webDriver;

class WebDriverFactory {
    

  async webDriver(options) {
    debugger;
    if (webDriver)
      return webDriver;
    else {
      // Builder API: https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_Builder.html
      webDriver = await new seleniumWebdriver.Builder()
        .forBrowser(options.browser)
        .setChromeOptions(/* add any options */)
        .setFirefoxOptions(/* add any options */)
        .setProxy(proxy.manual({
          [options.slave.protocol]: `${options.slave.ip}:${options.slave.port}`
        }))
        .build();
      return webDriver;
    }  
  }


}


module.exports = WebDriverFactory;