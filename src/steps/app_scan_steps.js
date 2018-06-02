const { Before, Given, When, Then, setDefaultTimeout, After } = require('cucumber');
const Code = require('code');
const expect = Code.expect;
const fs = require('fs');

/*
Before(() => {
  // Run before *every* scenario, no matter which feature or file.
  console.log('Im currently in a Before');

});
*/

Given('a new test session based on each build user supplied testSession', async function () {
  const sutBaseUrl = this.sut.baseUrl();
  const { findElementThenClick, findElementThenSendKeys } = this.sut.getBrowser();
  const { authentication: { route: loginRoute, usernameFieldLocater, passwordFieldLocater, submit }, testSession: { attributes: { username, password } } } = this.sut.getProperties(['authentication', 'testSession']);

  // Todo: KC: Allow for no loginRoute, usernameFieldLocater, passwordFieldLocater, user, pass

  await this.initialiseBrowser();
  const webDriver = this.sut.getBrowser().getWebDriver();
  await webDriver.getWindowHandle();
  await webDriver.get(`${sutBaseUrl}${loginRoute}`);
  await webDriver.sleep(1000);  
  await findElementThenSendKeys({name: usernameFieldLocater, value: username, visible: true});
  await findElementThenSendKeys({name: passwordFieldLocater, value: password, visible: true});
  await webDriver.sleep(1000);
  await findElementThenClick(submit);
});


Given('each build user supplied route of each testSession is navigated', async function () {
  const baseUrl = this.sut.baseUrl();
  const { findElementThenClick, findElementThenSendKeys } = this.sut.getBrowser();
  const { testSession: { id, relationships: { data: testSessionResourceIdentifiers } }, testRoutes: routeResourceObjects } = this.sut.getProperties(['testSession', 'testRoutes']);
  const routes = testSessionResourceIdentifiers.filter(resourceIdentifier => resourceIdentifier.type === 'route').map(resourceIdentifier => resourceIdentifier.id);
  const routeResourceObjectsOfSession = routeResourceObjects.filter(routeResourceObject => routes.includes(routeResourceObject.id));
  const webDriver = this.sut.getBrowser().getWebDriver();

  const promiseOfRouteFetchPopulateSubmit = routeResourceObjectsOfSession.map(routeResourceObject => {

    return new Promise (async (resolve, reject) => {

      // Todo: KC: Fix hard coded sleeps.
      await webDriver.sleep(1000)
        .then(() => {
          this.log.notice(`Navigating route id "${routeResourceObject.id}" of test session id "${id}".`, {tags: ['app_scan_steps']});
          return webDriver.get(`${baseUrl}${routeResourceObject.id}`); } )
        .then(() => { return webDriver.sleep(1000); } )
        .then(() => { return Promise.all(routeResourceObject.attributes.attackFields.map( attackField => {

          return findElementThenSendKeys(attackField)
          } )); } )
        .then(() => { return findElementThenClick(routeResourceObject.attributes.submit); } )
        .then(() => { return webDriver.sleep(1000); } )
        .then(() => { resolve(`Done ${routeResourceObject}`); } )
        .catch(err => {
          this.log.error(err.message, {tags: ['app_scan_steps']});
          reject(err)
        });
    });
  });
  await Promise.all(promiseOfRouteFetchPopulateSubmit).catch(reason => this.log.error(reason.message, {tags: ['app_scan_steps']}));

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
      this.log.notice(`Created new Zap context with a contextId of: ${contextId}.`, {tags: ['app_scan_steps']});
    },
      error => this.log.notice(`Error occured while attempting to create a new Zap context, message was: ${error.message}`, {tags: ['app_scan_steps']})
    );
});


Given('the application is spidered for each testSession', async function () {
  const sutBaseUrl = this.sut.baseUrl();
  const { authentication: { route: loginRoute, usernameFieldLocater, passwordFieldLocater }, loggedInIndicator, testSession: { attributes: { username, password } }, context: { name: contextName} } = this.sut.getProperties(['authentication', 'loggedInIndicator', 'testSession', 'context']);
  debugger;
  const { apiKey, spider: { maxDepth, threadCount, maxChildren } } = this.zap.getProperties(['apiKey', 'spider']);
  const zaproxy = this.zap.getZaproxy();  
  const enabled = true;
  const authenticationMethod = 'formBasedAuthentication';

  await zaproxy.spider.setOptionMaxDepth(maxDepth, apiKey).then(resp => this.log.notice(`Set the spider max depth. Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to set the spider max depth. Error was: ${err.message}`);
  await zaproxy.spider.setOptionThreadCount(threadCount, apiKey).then(resp => this.log.notice(`Set the spider thread count. Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to set the spider thread count. Error was: ${err.message}`);
  await zaproxy.context.includeInContext(contextName, sutBaseUrl, apiKey).then(resp => this.log.notice(`Added context "${sutBaseUrl}" to Zap. Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to add context "${sutBaseUrl}" to Zap. Error was: ${err.message}`);
  // Only the 'userName' onwards must be URL encoded. URL encoding entire line doesn't work.
  // https://github.com/zaproxy/zaproxy/wiki/FAQformauth
  await zaproxy.authentication.setAuthenticationMethod(contextId, authenticationMethod, `loginUrl=${sutBaseUrl}${loginRoute}&loginRequestData=${usernameFieldLocater}%3D%7B%25username%25%7D%26${passwordFieldLocater}%3D%7B%25password%25%7D%26_csrf%3D`, apiKey).then(resp => this.log.notice(`Set authentication method to "${authenticationMethod}". Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to set authentication method to "${authenticationMethod}". Error was: ${err.message}`);
  // https://github.com/zaproxy/zap-core-help/wiki/HelpStartConceptsAuthentication
  await zaproxy.authentication.setLoggedInIndicator(contextId, loggedInIndicator, apiKey).then(resp => this.log.notice(`Set logged in indicator "${loggedInIndicator}". Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to set logged in indicator to "${loggedInIndicator}". Error was: ${err.message}`);  
  await zaproxy.forcedUser.setForcedUserModeEnabled(enabled, apiKey).then(resp => this.log.notice(`Set forced user mode enabled to "${enabled}". Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to set forced user mode enabled to "${enabled}". Error was: ${err.message}`);  
  await zaproxy.users.newUser(contextId, username, apiKey)
    .then(resp => {
      userId = resp.userId;
      this.log.notice(`Set the newUser "${username}". Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']})
    },
      err => `Error occured while attempting to set the newUser "${username}". Error was: ${err.message}`
    );
  await zaproxy.forcedUser.setForcedUser(contextId, userId, apiKey).then(resp => this.log.notice(`Set forced user with Id "${userId}". Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to set forced user "${userId}". Error was: ${err.message}`);
  await zaproxy.users.setAuthenticationCredentials(contextId, userId, `username=${username}&password=${password}`, apiKey).then(resp => this.log.notice(`Set authentication credentials. Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to set authentication credentials. Error was: ${err.message}`);
  await zaproxy.users.setUserEnabled(contextId, userId, enabled, apiKey).then(resp => this.log.notice(`Set user enabled on user with id "${userId}". Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to set user enabled with id "${userId}". Error was: ${err.message}`);
  await zaproxy.spider.scan(sutBaseUrl, maxChildren, apiKey).then(resp => this.log.notice(`Spider scan initiated for "${sutBaseUrl}". Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to initiate spider scan for "${sutBaseUrl}". Error was: ${err.message}`);
});


Given('all active scanners are disabled', async function () {
  const apiKey = this.zap.getProperties('apiKey');
  const zaproxy = this.zap.getZaproxy();  
  const scanPolicyName = null;  
  await zaproxy.ascan.disableAllScanners(scanPolicyName, apiKey).then(resp => this.log.notice(`Disable all active scanners was called. Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to disable all active scanners. Error was: ${err.message}`);
});


Given('all active scanners are enabled', async function () {
  const apiKey = this.zap.getProperties('apiKey');
  const zaproxy = this.zap.getZaproxy();
  const { attributes: { aScannerAttackStrength, aScannerAlertThreshold } } = this.sut.getProperties('testSession');
  debugger;
  const scanPolicyName = null;
  const policyid = null;

  await zaproxy.ascan.enableAllScanners(scanPolicyName, apiKey).then(resp => this.log.notice(`Enable all active scanners was called. Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to enable all active scanners. Error was: ${err.message}`);
  await zaproxy.ascan.scanners(scanPolicyName, policyid).then(
    resp => {
      aScanners = resp.scanners;
      this.log.notice(`Obtained all ${aScanners.length} active scanners from Zap.`, {tags: ['app_scan_steps']});
    },
      err => `Error occured while attempting to get all active scanners from Zap. Error was: ${err.message}`
  );
  for (const ascanner of aScanners) {
    await zaproxy.ascan.setScannerAttackStrength(ascanner.id, aScannerAttackStrength, scanPolicyName, apiKey).then(
      result => this.log.notice(`Attack strength has been set ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}.`, {tags: ['app_scan_steps']}),
      error => this.log.error(`Error occured while attempting to set the attack strength for active scanner: { id: ${ascanner.id}, name: ${ascanner.name}. The error was: ${error.message}`, {tags: ['app_scan_steps']})
    );
    await zaproxy.ascan.setScannerAlertThreshold(ascanner.id, aScannerAlertThreshold, scanPolicyName, apiKey).then(
      result => this.log.notice(`Alert threshold has been set ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}.`, {tags: ['app_scan_steps']}),
      error => this.log.error(`Error occured while attempting to set the alert threshold for active scanner: { id: ${ascanner.id}, name: ${ascanner.name}. The error was: ${error.message}`, {tags: ['app_scan_steps']})
    );
  }  

  const zapApiPrintEnabledAScanersFuncCallback = (result) => {
    const scannersStateForBuildUser = result.scanners.reduce((all, each) => `${all}\nname: ${each.name.padEnd(50)}, id: ${each.id.padEnd(6)}, enabled: ${each.enabled}, attackStrength: ${each.attackStrength.padEnd(6)}, alertThreshold: ${each.alertThreshold.padEnd(6)}`, '');    
    // This is for the build user and the purpleteam admin:
    this.log.notice(`\n\nThe following are all the active scanners available with their current state:\n${scannersStateForBuildUser}`, {tags: ['app_scan_steps', 'pt-build-user']});
    // This is for the purpleteam admin only:
    this.log.notice(`\n\nThe following are all the active scanners available with their current state:\n\n${JSON.stringify(result)}\n\n`, {tags: ['app_scan_steps', 'pt-admin']});
  };  
  await zaproxy.ascan.scanners(scanPolicyName, policyid).then(zapApiPrintEnabledAScanersFuncCallback, eer => `Error occured while attempting to get the configured active scanners for display. Error was: ${err.message}`);
});


When('the active scan is run', async function () {
  const sutBaseUrl = this.sut.baseUrl();
  
  const { testSession: { id, relationships: { data: testSessionResourceIdentifiers } }, testRoutes: routeResourceObjects } = this.sut.getProperties(['testSession', 'testRoutes']);
  const routes = testSessionResourceIdentifiers.filter(resourceIdentifier => resourceIdentifier.type === 'route').map(resourceIdentifier => resourceIdentifier.id);
  const routeResourceObjectsOfSession = routeResourceObjects.filter(routeResourceObject => routes.includes(routeResourceObject.id));
  debugger;
  const { apiFeedbackSpeed, apiKey, spider: { maxChildren } } = this.zap.getProperties(['apiFeedbackSpeed', 'apiKey', 'spider']);
  const zaproxy = this.zap.getZaproxy();
  const log = this.log;

  let numberOfAlertsForSesh = 0;
  let sutAttackUrl;
  //let currentRouteResourceObject;
  //let resolveOfPromiseWithinPromiseOfAscan
  let routeResourceObjectForAscanCallback;

  const zapApiAscanScanPerRoute = (zapResult) => {
    //debugger;
    scanId = zapResult.scan;
    let runStatus = true;
    //debugger;
    return new Promise((resolver, reject) => {
      let statusValue = 'no status yet';
      let zapError;
      let zapInProgressIntervalId;
      log.notice(`Active scan initiated for test session with id: "${id}", route: "${routeResourceObjectForAscanCallback.id}". Response was: ${JSON.stringify(zapResult)}`, {tags: ['app_scan_steps']});

      
      let numberOfAlertsForRoute = 0;
      async function status() {
        //debugger;
        if(!runStatus) return;
        await zaproxy.ascan.status(scanId).then(
          result => {
            //debugger;
            if (result) statusValue = result.status;
            else statusValue = undefined;
          },
          error => {
            if (error) zapError = (error.error.code === 'ECONNREFUSED') ? error.message : '';
          }
        );
        await zaproxy.core.numberOfAlerts(sutAttackUrl).then(
          result => {
            if(result) numberOfAlertsForRoute = result.numberOfAlerts;  
            //debugger;
            if(runStatus) log.notice(`Scan ${scanId} is ${`${statusValue}%`.padEnd(4)} complete with ${numberOfAlertsForRoute.padEnd(3)} alerts for route: "${routeResourceObjectForAscanCallback.id}".`, {tags: ['app_scan_steps']});
          },
          error => zapError = error.message
        );
      }
      //debugger;
      zapInProgressIntervalId = setInterval(() => {
        status();
        if ( (zapError && statusValue !== String(100)) || (statusValue === undefined) ) {
          debugger;
          log.error(`Canceling test. Zap API is unreachible. ${zapError ? 'Zap Error: ${zapError}' : 'No status value available, may be due to incorrect api key.'}`, {tags: ['app_scan_steps']});
          clearInterval(zapInProgressIntervalId);
          reject(`Test failure: ${zapError}`);          
        } else if (statusValue === String(100)) {
          //debugger;
          log.notice(`We are finishing scan ${scanId} for the route: "${routeResourceObjectForAscanCallback.id}". Please see the report for further details.`, {tags: ['app_scan_steps']});
          //debugger
          clearInterval(zapInProgressIntervalId);
          //debugger;
          numberOfAlertsForSesh = (numberOfAlertsForSesh ? numberOfAlertsForSesh : 0) + parseInt(numberOfAlertsForRoute, 10);
          //status();
          //resolveOfPromiseWithinPromiseOfAscan();
          //debugger;
          runStatus = false;
          resolver(`We are finishing scan ${scanId} for route: "${routeResourceObjectForAscanCallback.id}". Please see the report for further details.`);
          //debugger;
          
        }
      }, apiFeedbackSpeed);
      //debugger;
    });
    //debugger;
  };

  await zaproxy.spider.scanAsUser(sutBaseUrl, contextId, userId, maxChildren, apiKey).then(resp => log.notice(`Spider scan as user "${userId}" for url "${sutBaseUrl}", context "${contextId}", with maxChildren "${maxChildren}" was called. Response was: ${JSON.stringify(resp)}`, {tags: ['app_scan_steps']}), err => `Error occured while attempting to scan as user. Error was: ${err.message}`);  

  for (let routeResourceObject of routeResourceObjectsOfSession) {
    routeResourceObjectForAscanCallback = routeResourceObject;
    const qs = `${ routeResourceObject.attributes.attackFields.reduce((queryString, queryParameterObject) => `${queryString}${queryString === '' ? '' : '&'}${queryParameterObject.name}=${queryParameterObject.value}`, '') }`;
    sutAttackUrl = `${sutBaseUrl}${routeResourceObject.id}`;

    // http://172.17.0.2:8080/UI/acsrf/ allows to add csrf tokens.
    //debugger;
    await zaproxy.ascan.scan(sutAttackUrl, true, false, '', routeResourceObject.attributes.method, qs, apiKey)
      .then(zapApiAscanScanPerRoute)
      // May need another then here...
      .catch(err => {
        debugger;
        log.error(`Error occured while attempting to initiate active scan of route: ${routeResourceObject.id}. Error was: ${err.message ? err.message : err}`, {tags: ['app_scan_steps']});
        // The following error means we haven't got the query string right.
        //Error occured while attempting to initiate active scan. Error was: 400 - {"code":"url_not_found","message":"URL Not Found in the Scan Tree"}
        //400 - {"code":"url_not_found","message":"URL Not Found in the Scan Tree"}
        reject(err)
      });
  }

  debugger;
  this.zap.numberOfAlertsForSesh(numberOfAlertsForSesh);
  debugger;
});


Then('the vulnerability count should not exceed the build user defined threshold of vulnerabilities known to Zap', function () {

  const { testSession: { id, attributes: { alertThreshold }, relationships: { data: testSessionResourceIdentifiers } }, testRoutes: routeResourceObjects } = this.sut.getProperties(['testSession', 'testRoutes']);
  const routes = testSessionResourceIdentifiers.filter(resourceIdentifier => resourceIdentifier.type === 'route').map(resourceIdentifier => resourceIdentifier.id);
  //debugger;
  const numberOfAlertsForSesh = this.zap.numberOfAlertsForSesh();
  debugger;
  if (numberOfAlertsForSesh > alertThreshold) {
    //debugger;
    // eslint-disable-next-line no-console
    this.log.notice(`Search the generated report for the routes: "${routes}", to see the ${numberOfAlertsForSesh - alertThreshold} vulnerabilities that exceed the Build User defined threshold of "${alertThreshold}"" for the session with id "${id}".`, {tags: ['app_scan_steps']});
  }
  debugger;
  expect(numberOfAlertsForSesh).to.be.at.most(alertThreshold);
});


// Todo: KC: Should promisify the fs.writeFile.
// The Zap reports are written to file,
After({tags: '@app_scan'}, async function () {

  const zaproxy = this.zap.getZaproxy();
  const { apiKey, reportDir } = this.zap.getProperties(['apiKey', 'reportDir']);
  const { testSession: { id }, reportFormats } = this.sut.getProperties(['testSession', 'reportFormats']);
  debugger;
  const zapApiReportFuncCallback = (resp) => {
    const toPrint = (resp => {
      debugger;
      if(typeof(resp) === 'object') return {format: 'json', text: JSON.stringify(resp)};
      if(typeof(resp) === 'string' && resp.startsWith('<html>')) return {format: 'html', text: resp};
      if(typeof(resp) === 'string' && resp.includes('# ZAP Scanning Report')) return {format: 'md', text: resp};
    })(resp);
    debugger;
    return new Promise((resolve, reject) => {
      debugger;
      const date = new Date();
      const reportPath = `${reportDir}testSessionId-${id}_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}.${toPrint.format}`;
      this.log.notice(`Writing ${toPrint.format}report to ${reportPath}`, {tags: ['app_scan_steps']});
      fs.writeFile(reportPath, toPrint.text, writeFileErr => {
        if (writeFileErr) {
          debugger;
          this.log.error(`Error writing ${toPrint.format}report file to disk: ${writeFileErr}`, {tags: ['app_scan_steps']});
          reject(`Error writing ${toPrint.format}report file to disk: ${writeFileErr}`);
        }
        debugger;
        this.log.notice(`Done writing ${toPrint.format}report file.`, {tags: ['app_scan_steps']});
        resolve(`Done writing ${toPrint.format}report file.`);
      });
    });
  };
  debugger;
  this.log.notice(`About to write reports in the following formats: ${[...reportFormats]}`, {tags: ['app_scan_steps']});
  debugger;
  const reportPromises = reportFormats.map(format => zaproxy.core[`${format}report`](apiKey).then(zapApiReportFuncCallback, err => `Error occured while attempting to create Zap ${format} report. Error was: ${err.message}`) );
  await Promise.all(reportPromises);
});
