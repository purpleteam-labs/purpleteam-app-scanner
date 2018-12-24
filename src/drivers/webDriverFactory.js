const webdriver = require('selenium-webdriver'); // eslint-disable-line no-unused-vars
const chrome = require('selenium-webdriver/chrome'); // eslint-disable-line no-unused-vars
// Todo: KC: provide support for the other web drivers.
const firefox = require('selenium-webdriver/firefox'); // eslint-disable-line no-unused-vars

const seleniumWebdriver = require('selenium-webdriver');

const proxy = require('selenium-webdriver/proxy');

let log; // Todo: KC: Should be provided by an IoC container.
let webDriver;

class WebDriverFactory {
  // eslint-disable-next-line class-methods-use-this
  async webDriver(options) {
    ({ log } = options);
    if (webDriver) return webDriver;
    // Builder API: https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_Builder.html
    // proxy module: https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/proxy.html
    try {
      webDriver = await new seleniumWebdriver.Builder()
        .forBrowser(options.browser)
        .setChromeOptions(/* add any options */)
        .setFirefoxOptions(/* add any options */)
        .setProxy(proxy.manual({ [options.slave.protocol]: `${options.slave.hostname}:${options.slave.port}` }))
        .usingServer(`http://${options.selenium.seleniumContainerName}:4444/wd/hub`)
        .build();
    } catch (error) {
      log.error(error, { tags: ['webdriver'] });
    }
    return webDriver;
  }
}


module.exports = WebDriverFactory;
