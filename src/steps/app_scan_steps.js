

const config = require('../../config/config');
const { Before, Given, When, Then } = require('cucumber');
const { expect } = require('code');
const { By } = require('selenium-webdriver');
const fs = require('fs');

/*
Before(() => {
  // Run before *every* scenario, no matter which feature or file.
  console.log('Im currently in a Before');

});
*/

Given('a new test session based on each build user supplied testSession', async function () {

  const sutBaseUrl = this.sut.baseUrl();
  const { route: loginRoute, usernameFieldLocater, passwordFieldLocater, username, password } = this.sut.getProperties('authentication');
  await this.initialiseBrowser();
  const webDriver = this.sut.getBrowser().getWebDriver();

  await webDriver.getWindowHandle();
  await webDriver.get(`${sutBaseUrl}${loginRoute}`);
  await webDriver.sleep(1000);
  await webDriver.findElement(By.name(usernameFieldLocater)).sendKeys(username);
  await webDriver.findElement(By.name(passwordFieldLocater)).sendKeys(password);
  await webDriver.sleep(1000);
  await webDriver.findElement({
    tagName: 'button',
    type: 'submit'
  }).click();

});


Given('each build user supplied route of each testSession is navigated', async function () {

  // Todo: KC: Obviously need to iterate the array
  const sutAttackUrl = `${this.sut.baseUrl()}${this.sut.getProperties('testRoute')}`;
  const routeAttributes = this.sut.getProperties('routeAttributes');
  const webDriver = this.sut.getBrowser().getWebDriver();
  // Todo: KC: Fix hard coded sleeps.
  await webDriver.sleep(1000);
  await webDriver.get(sutAttackUrl)
  await webDriver.sleep(1000);
  await Promise.all(routeAttributes.attackFields.map( attackField => webDriver.findElement(By.name(attackField.name)).sendKeys(attackField.value) ));
  await webDriver.findElement(By.name(routeAttributes.submit)).click();
  await webDriver.sleep(1000);

});


let contextId;
let userId;
let scanId;
let aScanners;


const callbacks = {
  zapCallback(result) {
    debugger;
    console.log('In zapApiGenericFuncCallback.');
    if(result && result.contextId) contextId = result.contextId;
    if(result && result.userId) userId = result.userId;
    if(result && result.scanners) aScanners = result.scanners;
    console.log(`PT Admin: Response from the Zap API: ${JSON.stringify(result)}`);
    return;
  },
  zapErrorHandler(error) {
    debugger;
    console.log('In zapApiErrorHandler.');
    console.log(`Error occured calling the Zap API: ${error.message}`);
    return;
  }
};


Given('a new scanning session based on each build user supplied testSession', async function () {


  const contextName = this.sut.getProperties('context').name;
  const apiKey = this.zap.getProperties('apiKey');
  const zaproxy = this.zap.getZaproxy();
  // Details around automated authentication detection and configuration: https://github.com/zaproxy/zaproxy/issues/4105
  // https://github.com/zaproxy/zap-core-help/wiki/HelpStartConceptsContexts
  // Todo: KC: The context and it's Id should probably be set in conjunction with the purpleteam authenticated build user and their specific SUT url. This information will need to also be in requests for auditing.
  await zaproxy.context.newContext(contextName, apiKey, callbacks);

// Todo: KC: Start with thenifying the zap client and my calls to it.
// .....................................................................................................................................................................














});




Given('the application is spidered for each testSession', async function () {
  const sutBaseUrl = this.sut.baseUrl();
  const { authentication: { route: loginRoute, usernameFieldLocater, passwordFieldLocater, username, password }, loggedInIndicator, testRoute, context: { name: contextName} } = this.sut.getProperties(['authentication', 'loggedInIndicator', 'testRoute', 'context']);
  const { apiKey, spider: { maxDepth, threadCount, maxChildren } } = this.zap.getProperties(['apiKey', 'spider']);
  const zaproxy = this.zap.getZaproxy();  
  const enabled = true;
  await zaproxy.spider.setOptionMaxDepth(maxDepth, apiKey, callbacks);
  await zaproxy.spider.setOptionThreadCount(threadCount, apiKey, callbacks);
  await zaproxy.context.includeInContext(contextName, sutBaseUrl, apiKey, callbacks);
  // Only the 'userName' onwards must be URL encoded. URL encoding entire line doesn't work.
  // https://github.com/zaproxy/zaproxy/wiki/FAQformauth
  await zaproxy.authentication.setAuthenticationMethod(contextId, 'formBasedAuthentication', `loginUrl=${sutBaseUrl}${loginRoute}&loginRequestData=${usernameFieldLocater}%3D%7B%25username%25%7D%26${passwordFieldLocater}%3D%7B%25password%25%7D%26_csrf%3D`, apiKey, callbacks);
  // https://github.com/zaproxy/zap-core-help/wiki/HelpStartConceptsAuthentication
  await zaproxy.authentication.setLoggedInIndicator(contextId, loggedInIndicator, apiKey, callbacks);
  await zaproxy.forcedUser.setForcedUserModeEnabled(enabled, apiKey, callbacks);
  await zaproxy.users.newUser(contextId, username, apiKey, callbacks);
  await zaproxy.forcedUser.setForcedUser(contextId, userId, apiKey, callbacks);
  await zaproxy.users.setAuthenticationCredentials(contextId, userId, `username=${username}&password=${password}`, apiKey, callbacks);
  await zaproxy.users.setUserEnabled(contextId, userId, enabled, apiKey, callbacks);
  await zaproxy.spider.scan(sutBaseUrl, maxChildren, apiKey, callbacks);
});


Given('all active scanners are disabled', async function () {
  const apiKey = this.zap.getProperties('apiKey');
  const zaproxy = this.zap.getZaproxy();  
  const scanPolicyName = null;
  await zaproxy.ascan.disableAllScanners(scanPolicyName, apiKey, callbacks)
});


Given('all active scanners are enabled', async function () {
  const apiKey = this.zap.getProperties('apiKey');
  const zaproxy = this.zap.getZaproxy();
  const { aScannerAttackStrength, aScannerAlertThreshold } = this.sut.getProperties('routeAttributes');
  const closedOverCallbacks = callbacks;
  const scanPolicyName = null;
  const policyid = null;

  console.log('\nEnabling active scanners...\n');
  await zaproxy.ascan.enableAllScanners(scanPolicyName, apiKey, callbacks);
  await zaproxy.ascan.scanners(scanPolicyName, policyid, callbacks);
  console.log('\n');

  for (const ascanner of aScanners) {
    await zaproxy.ascan.setScannerAttackStrength(ascanner.id, aScannerAttackStrength, scanPolicyName, apiKey, {
      zapCallback: result => console.log(`Attack strength has been set ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}.`),
      zapErrorHandler: error => console.log(`Error occured while attempting to set the attack strength for active scanner: { id: ${ascanner.id}, name: ${ascanner.name}. The error was: ${error.message}`)
    });
    await zaproxy.ascan.setScannerAlertThreshold(ascanner.id, aScannerAlertThreshold, scanPolicyName, apiKey, {
      zapCallback: result => console.log(`Alert threshold has been set ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}.`),
      zapErrorHandler: error => console.log(`Error occured while attempting to set the alert threshold for active scanner: { id: ${ascanner.id}, name: ${ascanner.name}. The error was: ${error.message}`)
    });
  }  

  const zapApiPrintEnabledAScanersFuncCallback = (result) => {
    const scannersStateForBuildUser = result.scanners.reduce((all, each) => `${all}\nname: ${each.name.padEnd(50)}, id: ${each.id.padEnd(6)}, enabled: ${each.enabled}, attackStrength: ${each.attackStrength.padEnd(6)}, alertThreshold: ${each.alertThreshold.padEnd(6)}`, '');    
    // This is for the build user and the purpleteam admin:
    console.log(`\n\nPT Build User: The following are all the active scanners available with their current state:\n${scannersStateForBuildUser}`);
    // This is for the purpleteam admin only:
    console.log(`\n\nPT Admin: The following are all the active scanners available with their current state:\n\n${JSON.stringify(result)}\n\n`);    
    return;
  };
  await zaproxy.ascan.scanners(scanPolicyName, policyid, { zapCallback: zapApiPrintEnabledAScanersFuncCallback, zapErrorHandler: callbacks.zapErrorHandler });
});


When('the active scan is run', async function () {
  const sutBaseUrl = this.sut.baseUrl();
  const { authentication: { route: loginRoute, username, password }, testRoute, routeAttributes: { attackFields, method } } = this.sut.getProperties(['authentication', 'testRoute', 'routeAttributes']);
  const { apiFeedbackSpeed, apiKey, spider: { maxChildren } } = this.zap.getProperties(['apiFeedbackSpeed', 'apiKey', 'spider']);
  const zaproxy = this.zap.getZaproxy();
  const sutAttackUrl = `${sutBaseUrl}${testRoute}`;
  let numberOfAlerts;

  const zapApiAscanScanFuncCallback = (result) => {
    return new Promise((resolve, reject) => {
      let statusValue = 'no status yet';
      let zapError;
      let zapInProgressIntervalId;
      console.log(`Response from scan: ${JSON.stringify(result)}`); // eslint-disable-line no-console

      scanId = result.scan;
      async function status() {
        await zaproxy.ascan.status(scanId, {
          zapCallback: result => {
            if (result) statusValue = result.status;
            else statusValue = undefined;
          },
          zapErrorHandler: error => {
            if (error) zapError = (error.error.code === 'ECONNREFUSED') ? error.message : '';
          }
        });
        await zaproxy.core.numberOfAlerts(sutAttackUrl, {
          zapCallback: result => {
            if(result) {
              ({ numberOfAlerts } = result);
            }
            console.log(`Scan ${scanId} is ${statusValue}% complete with ${numberOfAlerts} alerts.`); // eslint-disable-line no-console
          },
          zapErrorHandler: error => {
            zapError = error.message;
          }
        });
      }
      zapInProgressIntervalId = setInterval(() => {
        status();
        if ( (zapError && statusValue !== String(100)) || (statusValue === undefined) ) {
          console.log(`Canceling test. Zap API is unreachible. ${zapError ? 'Zap Error: ${zapError}' : 'No status value available, may be due to incorrect api key.'}`); // eslint-disable-line no-console
          clearInterval(zapInProgressIntervalId);
          debugger;
          reject(`Test failure: ${zapError}`);          
        } else if (statusValue === String(100)) {
          console.log(`We are finishing scan ${scanId}. Please see the report for further details.`); // eslint-disable-line no-console
          clearInterval(zapInProgressIntervalId);
          debugger;
          resolve(`We are finishing scan ${scanId}. Please see the report for further details.`);
          status();
        }
      }, apiFeedbackSpeed);
    });
  };

  await zaproxy.spider.scanAsUser(sutBaseUrl, contextId, userId, maxChildren, apiKey, callbacks);  
  console.log('\n');
  const qs = `${ attackFields.reduce((queryString, queryParameterObject) => `${queryString}${queryString === '' ? '' : '&'}${queryParameterObject.name}=${queryParameterObject.value}`, '') }&_csrf=&submit=`;
  await zaproxy.ascan.scan(sutAttackUrl, true, false, '', method, qs, /* http://172.17.0.2:8080/UI/acsrf/ allows to add csrf tokens.*/ apiKey, {zapCallback: zapApiAscanScanFuncCallback, zapErrorHandler: callbacks.zapErrorHandler});
  this.zap.numberOfAlerts(numberOfAlerts);
});


Then('the vulnerability count should not exceed the build user decided threshold of vulnerabilities known to Zap', function () {
  debugger;
  const numberOfAlerts = this.zap.numberOfAlerts();
  const { testRoute, routeAttributes: { alertThreshold } } = this.sut.getProperties(['testRoute', 'routeAttributes']);
  
  debugger  
  if (numberOfAlerts > alertThreshold) {
    // eslint-disable-next-line no-console
    console.log(`Search the generated report for "${testRoute}" to see the ${numberOfAlerts - alertThreshold} vulnerabilities that exceed the Build User defined threshold of: ${alertThreshold}`);
  }    
  expect(numberOfAlerts).to.be.at.most(alertThreshold);  
});


// Todo: KC: Should promisify the fs.writeFile along with wrapping the zap call in a promise
Then('the Zap report is written to file', async function () {
  debugger;
  const zaproxy = this.zap.getZaproxy();
  const { apiKey, reportDir } = this.zap.getProperties(['apiKey', 'reportDir']);
  const { testSessionId, testRoute } = this.sut.getProperties(['testSessionId', 'testRoute']);
  const closedOverCallbacks = callbacks;

  const zapApiHtmlReportFuncCallback = (result) => {
    debugger;
    return new Promise((resolve, reject) => {
      debugger;
      const date = new Date();
      const reportPath = `${reportDir}testSessionId-${testSessionId}_testRouteId${testRoute.split('/')[0]}_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}.html`;
      console.log(`Writing report to ${reportPath}`); // eslint-disable-line no-console
      fs.writeFile(reportPath, result, (writeFileErr) => {
        debugger;
        if (writeFileErr) {
          console.log(`Error writing report file to disk: ${writeFileErr}`); // eslint-disable-line no-console
          reject(`Error writing report file to disk: ${writeFileErr}`);
        }
      });
      //resolve('Done writing report file.');
      debugger;
      console.log('Done writing report file.');
      resolve('Done writing report file.');
    });
  };


  console.log('About to write report.'); // eslint-disable-line no-console
  await zaproxy.core.htmlreport(apiKey, {zapCallback: zapApiHtmlReportFuncCallback, zapErrorHandler: closedOverCallbacks.zapErrorHandler});
  debugger;
});
