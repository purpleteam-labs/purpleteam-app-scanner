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


Given('a new scanning session based on each build user supplied testSession', function () {
  const contextName = this.sut.getProperties('context').name;
  const apiKey = this.zap.getProperties('apiKey');
  const zaproxy = this.zap.getZaproxy();

  return zaproxy.context.newContext(contextName, apiKey).then(
    resp => {
      contextId = resp.contextId;
      console.log(`Created new Zap context with a contextId of: ${contextId}.`);
    },
      error => console.log(`Error occured while attempting to create a new Zap context, message was: ${error.message}`)
    );    
});


Given('the application is spidered for each testSession', async function () {
  const sutBaseUrl = this.sut.baseUrl();
  const { authentication: { route: loginRoute, usernameFieldLocater, passwordFieldLocater, username, password }, loggedInIndicator, testRoute, context: { name: contextName} } = this.sut.getProperties(['authentication', 'loggedInIndicator', 'testRoute', 'context']);
  const { apiKey, spider: { maxDepth, threadCount, maxChildren } } = this.zap.getProperties(['apiKey', 'spider']);
  const zaproxy = this.zap.getZaproxy();  
  const enabled = true;
  const authenticationMethod = 'formBasedAuthentication';

  await zaproxy.spider.setOptionMaxDepth(maxDepth, apiKey).then(resp => console.log(`Set the spider max depth. Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to set the spider max depth. Error was: ${err.message}`);
  await zaproxy.spider.setOptionThreadCount(threadCount, apiKey).then(resp => console.log(`Set the spider thread count. Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to set the spider thread count. Error was: ${err.message}`);
  await zaproxy.context.includeInContext(contextName, sutBaseUrl, apiKey).then(resp => console.log(`Added context "${sutBaseUrl}" to Zap. Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to add context "${sutBaseUrl}" to Zap. Error was: ${err.message}`);
  // Only the 'userName' onwards must be URL encoded. URL encoding entire line doesn't work.
  // https://github.com/zaproxy/zaproxy/wiki/FAQformauth
  await zaproxy.authentication.setAuthenticationMethod(contextId, authenticationMethod, `loginUrl=${sutBaseUrl}${loginRoute}&loginRequestData=${usernameFieldLocater}%3D%7B%25username%25%7D%26${passwordFieldLocater}%3D%7B%25password%25%7D%26_csrf%3D`, apiKey).then(resp => console.log(`Set authentication method to "${authenticationMethod}". Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to set authentication method to "${authenticationMethod}". Error was: ${err.message}`);
  // https://github.com/zaproxy/zap-core-help/wiki/HelpStartConceptsAuthentication
  await zaproxy.authentication.setLoggedInIndicator(contextId, loggedInIndicator, apiKey).then(resp => console.log(`Set logged in indicator "${loggedInIndicator}". Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to set logged in indicator to "${loggedInIndicator}". Error was: ${err.message}`);  
  await zaproxy.forcedUser.setForcedUserModeEnabled(enabled, apiKey).then(resp => console.log(`Set forced user mode enabled to "${enabled}". Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to set forced user mode enabled to "${enabled}". Error was: ${err.message}`);  
  await zaproxy.users.newUser(contextId, username, apiKey)
    .then(resp => {
      userId = resp.userId;
      console.log(`Set the newUser "${username}". Response was: ${JSON.stringify(resp)}`)
    },
      err => `Error occured while attempting to set the newUser "${username}". Error was: ${err.message}`
    );
  await zaproxy.forcedUser.setForcedUser(contextId, userId, apiKey).then(resp => console.log(`Set forced user with Id "${userId}". Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to set forced user "${userId}". Error was: ${err.message}`);
  await zaproxy.users.setAuthenticationCredentials(contextId, userId, `username=${username}&password=${password}`, apiKey).then(resp => console.log(`Set authentication credentials. Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to set authentication credentials. Error was: ${err.message}`);
  await zaproxy.users.setUserEnabled(contextId, userId, enabled, apiKey).then(resp => console.log(`Set user enabled on user with id "${userId}". Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to set user enabled with id "${userId}". Error was: ${err.message}`);
  await zaproxy.spider.scan(sutBaseUrl, maxChildren, apiKey).then(resp => console.log(`Spider scan initiated for "${sutBaseUrl}". Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to initiate spider scan for "${sutBaseUrl}". Error was: ${err.message}`);
});


Given('all active scanners are disabled', async function () {
  const apiKey = this.zap.getProperties('apiKey');
  const zaproxy = this.zap.getZaproxy();  
  const scanPolicyName = null;  
  await zaproxy.ascan.disableAllScanners(scanPolicyName, apiKey).then(resp => console.log(`Disable all active scanners was called. Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to disable all active scanners. Error was: ${err.message}`);
});


Given('all active scanners are enabled', async function () {
  const apiKey = this.zap.getProperties('apiKey');
  const zaproxy = this.zap.getZaproxy();
  const { aScannerAttackStrength, aScannerAlertThreshold } = this.sut.getProperties('routeAttributes');
  const scanPolicyName = null;
  const policyid = null;

  await zaproxy.ascan.enableAllScanners(scanPolicyName, apiKey).then(resp => console.log(`Enable all active scanners was called. Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to enable all active scanners. Error was: ${err.message}`);
  await zaproxy.ascan.scanners(scanPolicyName, policyid).then(
    resp => {
      aScanners = resp.scanners;
      console.log(`Obtained all ${aScanners.length} active scanners from Zap.`);
    },
      err => `Error occured while attempting to get all active scanners from Zap. Error was: ${err.message}`
  );
  console.log('\n');
  for (const ascanner of aScanners) {
    await zaproxy.ascan.setScannerAttackStrength(ascanner.id, aScannerAttackStrength, scanPolicyName, apiKey).then(
      result => console.log(`Attack strength has been set ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}.`),
      error => console.log(`Error occured while attempting to set the attack strength for active scanner: { id: ${ascanner.id}, name: ${ascanner.name}. The error was: ${error.message}`)
    );
    await zaproxy.ascan.setScannerAlertThreshold(ascanner.id, aScannerAlertThreshold, scanPolicyName, apiKey).then(
      result => console.log(`Alert threshold has been set ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}.`),
      error => console.log(`Error occured while attempting to set the alert threshold for active scanner: { id: ${ascanner.id}, name: ${ascanner.name}. The error was: ${error.message}`)
    );
  }  

  const zapApiPrintEnabledAScanersFuncCallback = (result) => {
    const scannersStateForBuildUser = result.scanners.reduce((all, each) => `${all}\nname: ${each.name.padEnd(50)}, id: ${each.id.padEnd(6)}, enabled: ${each.enabled}, attackStrength: ${each.attackStrength.padEnd(6)}, alertThreshold: ${each.alertThreshold.padEnd(6)}`, '');    
    // This is for the build user and the purpleteam admin:
    console.log(`\n\nPT Build User: The following are all the active scanners available with their current state:\n${scannersStateForBuildUser}`);
    // This is for the purpleteam admin only:
    console.log(`\n\nPT Admin: The following are all the active scanners available with their current state:\n\n${JSON.stringify(result)}\n\n`);
  };  
  await zaproxy.ascan.scanners(scanPolicyName, policyid).then(zapApiPrintEnabledAScanersFuncCallback, eer => `Error occured while attempting to get the configured active scanners for display. Error was: ${err.message}`);
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
      console.log(`Active scan initiated. Response was: ${JSON.stringify(result)}`); // eslint-disable-line no-console

      scanId = result.scan;
      async function status() {
        await zaproxy.ascan.status(scanId).then(
          result => {
            if (result) statusValue = result.status;
            else statusValue = undefined;
          },
          error => {
            if (error) zapError = (error.error.code === 'ECONNREFUSED') ? error.message : '';
          }
        );
        await zaproxy.core.numberOfAlerts(sutAttackUrl).then(
          result => {
            if(result) ({ numberOfAlerts } = result);            
            console.log(`Scan ${scanId} is ${statusValue}% complete with ${numberOfAlerts} alerts.`); // eslint-disable-line no-console
          },
          error => zapError = error.message
        );
      }
      zapInProgressIntervalId = setInterval(() => {
        status();
        if ( (zapError && statusValue !== String(100)) || (statusValue === undefined) ) {
          console.log(`Canceling test. Zap API is unreachible. ${zapError ? 'Zap Error: ${zapError}' : 'No status value available, may be due to incorrect api key.'}`); // eslint-disable-line no-console
          clearInterval(zapInProgressIntervalId);
          reject(`Test failure: ${zapError}`);          
        } else if (statusValue === String(100)) {
          console.log(`We are finishing scan ${scanId}. Please see the report for further details.`); // eslint-disable-line no-console
          clearInterval(zapInProgressIntervalId);
          resolve(`We are finishing scan ${scanId}. Please see the report for further details.`);
          status();
        }
      }, apiFeedbackSpeed);
    });
  };

  await zaproxy.spider.scanAsUser(sutBaseUrl, contextId, userId, maxChildren, apiKey).then(resp => console.log(`Spider scan as user "${userId}" for url "${sutBaseUrl}", context "${contextId}", with maxChildren "${maxChildren}" was called. Response was: ${JSON.stringify(resp)}`), err => `Error occured while attempting to scan as user. Error was: ${err.message}`);  
  console.log('\n');
  const qs = `${ attackFields.reduce((queryString, queryParameterObject) => `${queryString}${queryString === '' ? '' : '&'}${queryParameterObject.name}=${queryParameterObject.value}`, '') }&_csrf=&submit=`;
  await zaproxy.ascan.scan(sutAttackUrl, true, false, '', method, qs, /* http://172.17.0.2:8080/UI/acsrf/ allows to add csrf tokens.*/ apiKey).then(zapApiAscanScanFuncCallback, err => `Error occured while attempting to initiate active scan. Error was: ${err.message}`);
  this.zap.numberOfAlerts(numberOfAlerts);
});


Then('the vulnerability count should not exceed the build user defined threshold of vulnerabilities known to Zap', function () {
  const numberOfAlerts = this.zap.numberOfAlerts();
  const { testRoute, routeAttributes: { alertThreshold } } = this.sut.getProperties(['testRoute', 'routeAttributes']);  
  
  if (numberOfAlerts > alertThreshold) {
    // eslint-disable-next-line no-console
    console.log(`Search the generated report for "${testRoute}" to see the ${numberOfAlerts - alertThreshold} vulnerabilities that exceed the Build User defined threshold of: ${alertThreshold}`);
  }    
  expect(numberOfAlerts).to.be.at.most(alertThreshold);
});


// Todo: KC: Should promisify the fs.writeFile.
Then('the Zap report is written to file', async function () {  
  const zaproxy = this.zap.getZaproxy();
  const { apiKey, reportDir } = this.zap.getProperties(['apiKey', 'reportDir']);
  const { testSessionId, testRoute } = this.sut.getProperties(['testSessionId', 'testRoute']);
  
  const zapApiHtmlReportFuncCallback = (result) => {
    return new Promise((resolve, reject) => {
      const date = new Date();
      const reportPath = `${reportDir}testSessionId-${testSessionId}_testRouteId${testRoute.split('/')[0]}_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}.html`;
      console.log(`Writing report to ${reportPath}`); // eslint-disable-line no-console
      fs.writeFile(reportPath, result, (writeFileErr) => {
        if (writeFileErr) {
          console.log(`Error writing report file to disk: ${writeFileErr}`); // eslint-disable-line no-console
          reject(`Error writing report file to disk: ${writeFileErr}`);
        }
      });
      console.log('Done writing report file.');
      resolve('Done writing report file.');
    });
  };

  console.log('About to write report.'); // eslint-disable-line no-console
  debugger
  await zaproxy.core.htmlreport(apiKey).then(zapApiHtmlReportFuncCallback, err => `Error occured while attempting to create Zap html report. Error was: ${err.message}`);
  debugger;
});
