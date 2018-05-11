

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
  debugger;
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
  debugger;
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




Given('a new scanning session based on each build user supplied testSession', () => {});
Given('each build user supplied route of each testSession is spidered', () => {});
Given('all scanners are disabled', () => {});

Given('the following scanners are enabled', (dataTable) => {

    
  // Todo: Use the table.
  console.log(dataTable);
});





When('the active scanner is run', async function () {

  const sutBaseUrl = this.sut.baseUrl();
  debugger;
  const { authentication: { route: loginRoute, username, password }, testRoute } = this.sut.getProperties(['authentication', 'testRoute']);

  const { apiFeedbackSpeed, apiKey } = this.zap.getProperties(['apiFeedbackSpeed', 'apiKey']);
  const zaproxy = this.zap.getZaproxy();
  const sutAttackUrl = `${sutBaseUrl}${testRoute}`;

  const contextId = 1;
  const maxChildren = 1;
  let numberOfAlerts;
  let userId;
  let scanId;
  let zapInProgressIntervalId;

  let outerResolve;
  let outerReject;


  const zapApiGenericFuncCallback = (err, resp) => {
    console.log('In zapApiFuncCallback.')
    if(err) {
      console.log(`Error occured calling the Zap API: ${JSON.stringify(err)}`);
      outerReject(err);
    }
    console.log(`Response from the Zap API: ${JSON.stringify(resp)}`);
    outerResolve(resp);
  };


  const zapApiAscanScanFuncCallback = (err, resp) => {
    let statusValue = 'no status yet';
    let zapError;
    console.log(`Response from scan: ${JSON.stringify(resp)}`); // eslint-disable-line no-console
    debugger;
    scanId = resp.scan;
    function status() {
      zaproxy.ascan.status(scanId, (statusErr, statusResp) => {
        if (statusResp) statusValue = statusResp.status;
        else statusValue = undefined;
        if (statusErr) zapError = (statusErr.code === 'ECONNREFUSED') ? statusErr : '';
        zaproxy.core.numberOfAlerts(sutAttackUrl, (numberOfAlertsErr, numberOfAlertsResp) => {
          if (numberOfAlertsResp) {
            ({ numberOfAlerts } = numberOfAlertsResp);
          }
          // else console.log(err);
          console.log(`Scan ${scanId} is ${statusValue}% complete with ${numberOfAlerts} alerts.`); // eslint-disable-line no-console
        });
      });
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
        status();
      }
    }, apiFeedbackSpeed);
  };

  // Details around automated authentication detection and configuration: https://github.com/zaproxy/zaproxy/issues/4105
  const zaproxyFuncsAndParams = [
    {func: zaproxy.context.newContext,                     args: ['NodeGoat Context', apiKey, zapApiGenericFuncCallback]},
    {func: zaproxy.spider.scan,                            args: [sutBaseUrl, maxChildren, apiKey, zapApiGenericFuncCallback]},
    {func: zaproxy.context.includeInContext,               args: ['NodeGoat Context', sutBaseUrl, apiKey, zapApiGenericFuncCallback]},
    // Only the 'userName' onwards must be URL encoded. URL encoding entire line doesn't work.
    {func: zaproxy.authentication.setAuthenticationMethod, args: [contextId, 'formBasedAuthentication', `loginUrl=${sutBaseUrl}/login&loginRequestData=userName%3D%7B%25username%25%7D%26password%3D%7B%25password%25%7D%26_csrf%3D`, apiKey, zapApiGenericFuncCallback]},
    {func: zaproxy.authentication.setLoggedInIndicator,    args: [contextId, '<p>Moved Temporarily. Redirecting to <a href="/dashboard">/dashboard</a></p>', apiKey, zapApiGenericFuncCallback]},
    {func: zaproxy.forcedUser.setForcedUserModeEnabled,    args: [enabled, apiKey, zapApiGenericFuncCallback]},
    {func: zaproxy.users.newUser,                          args: [contextId, username, apiKey, zapApiGenericFuncCallback]},
    {func: zaproxy.forcedUser.setForcedUser,               args: [contextId, userId, apiKey, zapApiGenericFuncCallback]},
    {func: zaproxy.users.setAuthenticationCredentials,     args: [contextId, userId, `username=${username}&password=${password}`, apiKey, zapApiGenericFuncCallback]},
    {func: zaproxy.users.setUserEnabled,                   args: [contextId, userId, enabled, apiKey, zapApiGenericFuncCallback]},
    {func: zaproxy.spider.scanAsUser,                      args: [sutBaseUrl, contextId, userId, maxChildren, apiKey, zapApiGenericFuncCallback]},
    {func: zaproxy.ascan.scan,                             args: [sutAttackUrl, true, false, '', 'POST', 'firstName=JohnseleniumJohn&lastName=DoeseleniumDoe&ssn=seleniumSSN&dob=12/23/5678&bankAcc=seleniumBankAcc&bankRouting=0198212#&address=seleniumAddress&_csrf=&submit=', /* http://172.17.0.2:8080/UI/acsrf/ allows to add csrf tokens.*/ apiKey, zapApiAscanScanFuncCallback]}
  ];


  const promiseOfZaproxyFunctions = zaproxyFuncsAndParams.map((funcAndParams) => {
    return new Promise((resolve, reject) => {
      outerReject = resolve;
      outerResolve = resolve;
      console.log(`Processing element with function ${funcAndParams.func}.`);
      funcAndParams.func(...funcAndParams.args)
      console.log(`Executed element with function ${funcAndParams.func}.`);
    })
  });

  await Promise.all(promiseOfZaproxyFunctions).then(outcome => this.outputOfTestStep(outcome));
  this.zap.numberOfAlerts(numberOfAlerts);
});


Then('the vulnerability count should not exceed the build user decided threshold of vulnerabilities known to Zap', () => {
  const resultsOfPreviousStep = this.outputOfTestStep();
  const numberOfAlerts = this.zap.numberOfAlerts();
  const { testRoute, routeAttributes: { alertThreshold } } = this.sut.getProperties(['testRoute', 'routeAttributes']);
  
  debugger
  console.log(resultsOfPreviousStep); // eslint-disable-line no-console
  if (numberOfAlerts > alertThreshold) {
    // eslint-disable-next-line no-console
    console.log(`Search the generated report for "/${testRoute}" to see the ${numberOfAlerts - alertThreshold} vulnerabilities that exceed the Build User defined threshold of: ${alertThreshold}`);
  }    
  expect(numberOfAlerts).to.be.at.most(alertThreshold);  
});


// Todo: KC: Should promisify the fs.writeFile along with wrapping the zap call in a promise
Then('the Zap report is written to file', () => {

  const zaproxy = this.zap.getZaproxy();
  const { apiKey, reportDir } = this.zap.getProperties(['apiKey', 'reportDir']);
  const { testSessionId, testRoute } = this.sut.getProperties(['testSessionId', 'testRoute']);

  console.log('About to write report.'); // eslint-disable-line no-console
  zaproxy.core.htmlreport(apiKey, (htmlreportErr, htmlreportResp) => {
    const date = new Date();
    const reportPath = `${reportDir}testSessionId-${testSessionId}_testRouteId${testRoute.split('/')[0]}_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}.html`;
    console.log(`Writing report to ${reportPath}`); // eslint-disable-line no-console
    fs.writeFile(reportPath, htmlreportResp, (writeFileErr) => {
      if (writeFileErr) console.log(`Error writing report file to disk: ${writeFileErr}`); // eslint-disable-line no-console
    });
    //resolve('Done writing report file.');
    console.log('Done writing report file.');
  });

});
