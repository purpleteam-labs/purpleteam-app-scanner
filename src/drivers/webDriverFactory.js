const { Builder } = require('selenium-webdriver');
const proxy = require('selenium-webdriver/proxy');

const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');

const chromeOptions = new chrome.Options();
const firefoxOptions = new firefox.Options();

// chromeOptions.addArguments(['--enable-logging', '--log-level=0', '--verbose', '--whitelisted-ips=""', '--ignore-certificate-errors', '--unsafely-treat-insecure-origin-as-secure=https://nodegoat.sut.purpleteam-labs.com/', '--disable-web-security', '--user-date-dir', '--allow-running-insecure-content']);
// firefoxOptions.addArguments(['webdriver_accept_untrusted_certs=true', 'webdriver_assume_untrusted_issuer=true']);
// chromeOptions.addArguments(['--user-data-dir=/var/dir', '--unsafely-treat-insecure-origin-as-secure=https://nodegoat.sut.purpleteam-labs.com/']);

// Until we have the Zap Root cert loaded into browser profiles and the profiles provided to selenium, we need to have setAcceptInsecureCerts(true).
// Same goes for any self-signed SUT certs
// https://gitlab.com/purpleteam-labs/purpleteam/-/issues/21
chromeOptions.setAcceptInsecureCerts(true).set('cats', false).merge({ acceptSslCerts: true, trustAllSSLCertificates: true });
firefoxOptions.setAcceptInsecureCerts(true).set('cats', false).merge({ acceptSslCerts: true, trustAllSSLCertificates: true });

// For Firefox: https://developer.mozilla.org/en-US/docs/Web/WebDriver/Capabilities/firefoxOptions
// https://stackoverflow.com/questions/57422401/protractor-selenium-started-ignoring-the-chrome-options-chromeoptions-in-protr

let log; // Todo: KC: Should be provided by an IoC container.
let webDriver;

class WebDriverFactory {
  // eslint-disable-next-line class-methods-use-this
  async webDriver(options) {
    ({ log } = options);
    const { sutProtocol, browser, slave: { hostname: slaveHostname, port: slavePort }, selenium: { seleniumContainerName, seleniumPort } } = options;
    if (webDriver) return webDriver;
    log.debug(`The server is: http://${seleniumContainerName}:${seleniumPort}/wd/hub`, { tags: [`pid-${process.pid}`, 'webDriverFactory'] });
    try {
      webDriver = await new Builder()
        .forBrowser(browser)
        .setChromeOptions(chromeOptions)
        .setFirefoxOptions(firefoxOptions)
        // Set proxy based on the type (protocol) of web requests being proxied through the proxy. This is not the protocol of the proxy itself.
        .setProxy(proxy.manual({ [sutProtocol]: `${slaveHostname}:${slavePort}` }))
        .usingServer(`http://${seleniumContainerName}:${seleniumPort}/wd/hub`)
        .build();
    } catch (error) {
      log.error(`Error occured while attempting to create the webDriver. Error was: ${error}`, { tags: [`pid-${process.pid}`, 'webDriverFactory'] });
    }
    // await webDriver.manage().setTimeouts({ script: 10000, pageLoad: 60000, implicit: 70000 });
    return webDriver;
  }
}


module.exports = WebDriverFactory;
