const { /* Before, */ Given, When, Then /* , setDefaultTimeout */, After } = require('cucumber');
const Code = require('code');

const { expect } = Code;
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
  const { authentication, authentication: { route: loginRoute, usernameFieldLocater, passwordFieldLocater, submit }, testSession: { id, attributes: { username, password } } } = this.sut.getProperties(['authentication', 'testSession']);
  // const { authentication, testSession: { attributes: { username, password } } } = this.sut.getProperties(['authentication', 'testSession']);
  const expectedLogInResponse = {
    success: authentication.expectedResponseSuccess,
    fail: authentication.expectedResponseFail
  };


  // Todo: KC: Allow for no loginRoute, usernameFieldLocater, passwordFieldLocater, user, pass

  await this.initialiseBrowser();
  const webDriver = this.sut.getBrowser().getWebDriver();
  await webDriver.getWindowHandle();
  await webDriver.get(`${sutBaseUrl}${loginRoute}`);
  await webDriver.sleep(1000);
  await findElementThenSendKeys({ name: usernameFieldLocater, value: username, visible: true }, id);
  await findElementThenSendKeys({ name: passwordFieldLocater, value: password, visible: true }, id);
  await webDriver.sleep(1000);
  await findElementThenClick(submit, id, expectedLogInResponse);
});


Given('each build user supplied route of each testSession is navigated', async function () {
  const baseUrl = this.sut.baseUrl();
  const { findElementThenClick, findElementThenSendKeys } = this.sut.getBrowser();
  const { testSession: { id, relationships: { data: testSessionResourceIdentifiers } }, testRoutes: routeResourceObjects } = this.sut.getProperties(['testSession', 'testRoutes']);
  const routes = testSessionResourceIdentifiers.filter(resourceIdentifier => resourceIdentifier.type === 'route').map(resourceIdentifier => resourceIdentifier.id);
  const routeResourceObjectsOfSession = routeResourceObjects.filter(routeResourceObject => routes.includes(routeResourceObject.id));
  const webDriver = this.sut.getBrowser().getWebDriver();

  const promiseOfRouteFetchPopulateSubmit = routeResourceObjectsOfSession.map(routeResourceObject => new Promise(async (resolve, reject) => {
    // Todo: KC: Fix hard coded sleeps.
    await webDriver.sleep(1000)
      .then(() => {
        this.publisher.pubLog({ testSessionId: id, logLevel: 'notice', textData: `Navigating route id "${routeResourceObject.id}" of test session id "${id}".`, tagObj: { tags: ['app_scan_steps'] } });
        return webDriver.get(`${baseUrl}${routeResourceObject.id}`);
      })
      .then(() => webDriver.sleep(1000))
      .then(() => Promise.all(routeResourceObject.attributes.attackFields.map(attackField => findElementThenSendKeys(attackField, id))))
      .then(() => findElementThenClick(routeResourceObject.attributes.submit, id))
      .then(() => webDriver.sleep(1000))
      .then(() => { resolve(`Done ${routeResourceObject}`); })
      .catch((err) => {
        this.publisher.pubLog({ testSessionId: id, logLevel: 'error', textData: err.message, tagObj: { tags: ['app_scan_steps'] } });
        reject(err);
      });
  }));
  await Promise.all(promiseOfRouteFetchPopulateSubmit).catch(reason => this.publisher.pubLog({ testSessionId: id, logLevel: 'error', textData: reason.message, tagObj: { tags: ['app_scan_steps'] } }));
  // Todo: KC: Bring the selenium grid down.
});


let contextId;
let userId;
let scanId;
let aScanners;


Given('a new scanning session based on each build user supplied testSession', function () {
  const { testSession: { id: testSessionId }, context: { name: contextName } } = this.sut.getProperties(['testSession', 'context']);
  const zaproxy = this.zap.getZaproxy();

  return zaproxy.context.newContext(contextName).then(
    (resp) => {
      ({ contextId } = resp);
      this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Created new Zap context with a contextId of: ${contextId}, correlating with the contextName of: ${contextName}.`, tagObj: { tags: ['app_scan_steps'] } });
    },
    error => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Error occured while attempting to create a new Zap context, message was: ${error.message}`, tagObj: { tags: ['app_scan_steps'] } })
  );
});


Given('the application is spidered for each testSession', async function () {
  const sutBaseUrl = this.sut.baseUrl();
  const { authentication: { route: loginRoute, usernameFieldLocater, passwordFieldLocater }, loggedInIndicator, testSession: { id: testSessionId, attributes: { username, password } }, context: { name: contextName } } = this.sut.getProperties(['authentication', 'loggedInIndicator', 'testSession', 'context']);

  const { maxDepth, threadCount, maxChildren } = this.zap.getProperties('spider');
  const zaproxy = this.zap.getZaproxy();
  const enabled = true;
  const authenticationMethod = 'formBasedAuthentication';

  await zaproxy.spider.setOptionMaxDepth(maxDepth)
    .then(
      resp => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Set the spider max depth. Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to set the spider max depth. Error was: ${err.message}`
    );
  await zaproxy.spider.setOptionThreadCount(threadCount)
    .then(
      resp => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Set the spider thread count. Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to set the spider thread count. Error was: ${err.message}`
    );
  await zaproxy.context.includeInContext(contextName, sutBaseUrl)
    .then(
      resp => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Added context "${sutBaseUrl}" to Zap. Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to add context "${sutBaseUrl}" to Zap. Error was: ${err.message}`
    );
  // Only the 'userName' onwards must be URL encoded. URL encoding entire line doesn't work.
  // https://github.com/zaproxy/zaproxy/wiki/FAQformauth
  await zaproxy.authentication.setAuthenticationMethod(contextId, authenticationMethod, `loginUrl=${sutBaseUrl}${loginRoute}&loginRequestData=${usernameFieldLocater}%3D%7B%25username%25%7D%26${passwordFieldLocater}%3D%7B%25password%25%7D%26_csrf%3D`)
    .then(
      resp => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Set authentication method to "${authenticationMethod}". Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to set authentication method to "${authenticationMethod}". Error was: ${err.message}`
    );
  // https://github.com/zaproxy/zap-core-help/wiki/HelpStartConceptsAuthentication
  await zaproxy.authentication.setLoggedInIndicator(contextId, loggedInIndicator)
    .then(
      resp => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Set logged in indicator "${loggedInIndicator}". Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to set logged in indicator to "${loggedInIndicator}". Error was: ${err.message}`
    );
  await zaproxy.forcedUser.setForcedUserModeEnabled(enabled)
    .then(
      resp => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Set forced user mode enabled to "${enabled}". Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to set forced user mode enabled to "${enabled}". Error was: ${err.message}`
    );
  await zaproxy.users.newUser(contextId, username).then(
    (resp) => {
      ({ userId } = resp);
      this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Set the newUser "${username}". Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } });
    },
    err => `Error occured while attempting to set the newUser "${username}". Error was: ${err.message}`
  );
  await zaproxy.forcedUser.setForcedUser(contextId, userId)
    .then(
      resp => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Set forced user with Id "${userId}". Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to set forced user "${userId}". Error was: ${err.message}`
    );
  await zaproxy.users.setAuthenticationCredentials(contextId, userId, `username=${username}&password=${password}`)
    .then(
      resp => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Set authentication credentials. Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to set authentication credentials. Error was: ${err.message}`
    );
  await zaproxy.users.setUserEnabled(contextId, userId, enabled)
    .then(
      resp => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Set user enabled on user with id "${userId}". Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to set user enabled with id "${userId}". Error was: ${err.message}`
    );
  await zaproxy.spider.scan(sutBaseUrl, maxChildren)
    .then(
      resp => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Spider scan initiated for "${sutBaseUrl}". Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to initiate spider scan for "${sutBaseUrl}". Error was: ${err.message}`
    );
});


Given('all active scanners are disabled', async function () {
  const { id: testSessionId } = this.sut.getProperties('testSession');
  const zaproxy = this.zap.getZaproxy();
  const scanPolicyName = null;
  await zaproxy.ascan.disableAllScanners(scanPolicyName)
    .then(
      resp => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Disable all active scanners was called. Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to disable all active scanners. Error was: ${err.message}`
    );
});


Given('all active scanners are enabled', async function () {
  const zaproxy = this.zap.getZaproxy();
  const { id: testSessionId, attributes: { aScannerAttackStrength, aScannerAlertThreshold } } = this.sut.getProperties('testSession');

  const scanPolicyName = null;
  const policyid = null;

  await zaproxy.ascan.enableAllScanners(scanPolicyName)
    .then(
      resp => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Enable all active scanners was called. Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to enable all active scanners. Error was: ${err.message}`
    );
  await zaproxy.ascan.scanners(scanPolicyName, policyid).then(
    (resp) => {
      aScanners = resp.scanners;
      this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Obtained all ${aScanners.length} active scanners from Zap.`, tagObj: { tags: ['app_scan_steps'] } });
    },
    err => `Error occured while attempting to get all active scanners from Zap. Error was: ${err.message}`
  );
  // Zap seems to have some sort of ordering problem if we use a Promise.all
  // Optimising this would only save milliseconds, & the entire testing process takes minutes, ignoring this chance for micro-optimisation.
  for (const ascanner of aScanners) { // eslint-disable-line no-restricted-syntax
    // eslint-disable-next-line no-await-in-loop
    await zaproxy.ascan.setScannerAttackStrength(ascanner.id, aScannerAttackStrength, scanPolicyName).then(
      result => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Attack strength has been set ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}.`, tagObj: { tags: ['app_scan_steps'] } }),
      error => this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Error occured while attempting to set the attack strength for active scanner: { id: ${ascanner.id}, name: ${ascanner.name}. The error was: ${error.message}`, tagObj: { tags: ['app_scan_steps'] } })
    );
    // eslint-disable-next-line no-await-in-loop
    await zaproxy.ascan.setScannerAlertThreshold(ascanner.id, aScannerAlertThreshold, scanPolicyName).then(
      result => this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Alert threshold has been set ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}.`, tagObj: { tags: ['app_scan_steps'] } }),
      error => this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Error occured while attempting to set the alert threshold for active scanner: { id: ${ascanner.id}, name: ${ascanner.name}. The error was: ${error.message}`, tagObj: { tags: ['app_scan_steps'] } })
    );
  }

  const zapApiPrintEnabledAScanersFuncCallback = (result) => { // eslint-disable-line no-unused-vars
    const scannersStateForBuildUser = result.scanners.reduce((all, each) => `${all}\nname: ${each.name.padEnd(50)}, id: ${each.id.padEnd(6)}, enabled: ${each.enabled}, attackStrength: ${each.attackStrength.padEnd(6)}, alertThreshold: ${each.alertThreshold.padEnd(6)}`, '');
    // This is for the build user and the purpleteam admin:
    this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `\n\nThe following are all the active scanners available with their current state:\n${scannersStateForBuildUser}\n`, tagObj: { tags: ['app_scan_steps', 'pt-build-user'] } });
    // This is for the purpleteam admin only:
    this.log.notice(`\n\nThe following are all the active scanners available with their current state:\n\n${JSON.stringify(result, null, 2)}\n\n`, { tags: ['app_scan_steps', 'pt-admin'] });
  };
  await zaproxy.ascan.scanners(scanPolicyName, policyid).then(zapApiPrintEnabledAScanersFuncCallback, err => `Error occured while attempting to get the configured active scanners for display. Error was: ${err.message}`);
});


When('the active scan is run', async function () {
  const sutBaseUrl = this.sut.baseUrl();

  const { testSession: { id: testSessionId, relationships: { data: testSessionResourceIdentifiers } }, testRoutes: routeResourceObjects } = this.sut.getProperties(['testSession', 'testRoutes']);
  const routes = testSessionResourceIdentifiers.filter(resourceIdentifier => resourceIdentifier.type === 'route').map(resourceIdentifier => resourceIdentifier.id);
  const routeResourceObjectsOfSession = routeResourceObjects.filter(routeResourceObject => routes.includes(routeResourceObject.id));

  const { apiFeedbackSpeed, spider: { maxChildren } } = this.zap.getProperties(['apiFeedbackSpeed', 'spider']);
  const zaproxy = this.zap.getZaproxy();
  const { publisher } = this;

  let numberOfAlertsForSesh = 0;
  let combinedStatusValueOfRoutesForSesh = 0;
  let sutAttackUrl;
  // let currentRouteResourceObject;
  // let resolveOfPromiseWithinPromiseOfAscan
  let routeResourceObjectForAscanCallback;

  const zapApiAscanScanPerRoute = (zapResult) => {
    scanId = zapResult.scan;
    let runStatus = true;
    return new Promise((resolver, reject) => {
      let statusValueForRoute = 'no status yet';
      let zapError;
      let zapInProgressIntervalId;
      publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Active scan initiated for test session with id: "${testSessionId}", route: "${routeResourceObjectForAscanCallback.id}". Response was: ${JSON.stringify(zapResult)}`, tagObj: { tags: ['app_scan_steps'] } });

      let numberOfAlertsForRoute = 0;
      async function status() {
        if (!runStatus) return;
        await zaproxy.ascan.status(scanId).then(
          (result) => {
            if (result) statusValueForRoute = parseInt(result.status, 10);
            else statusValueForRoute = undefined;
          },
          (error) => {
            if (error) zapError = (error.error.code === 'ECONNREFUSED') ? error.message : '';
          }
        );
        await zaproxy.core.numberOfAlerts(sutAttackUrl).then(
          (result) => {
            if (result) numberOfAlertsForRoute = parseInt(result.numberOfAlerts, 10);
            if (runStatus) {
              publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Scan ${scanId} is ${`${statusValueForRoute}%`.padEnd(4)} complete with ${`${numberOfAlertsForRoute}`.padEnd(3)} alerts for route: "${routeResourceObjectForAscanCallback.id}".`, tagObj: { tags: ['app_scan_steps'] } });
              publisher.publish(testSessionId, (combinedStatusValueOfRoutesForSesh + statusValueForRoute) / routes.length, 'testerPctComplete');
              publisher.publish(testSessionId, numberOfAlertsForSesh + numberOfAlertsForRoute, 'testerBugCount');
            }
          },
          (error) => { zapError = error.message; }
        );
      }
      zapInProgressIntervalId = setInterval(() => { // eslint-disable-line prefer-const
        status();
        if ((zapError && statusValueForRoute !== 100) || (statusValueForRoute === undefined)) {
          publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Canceling test. Zap API is unreachible. ${zapError ? `Zap Error: ${zapError}` : 'No status value available, may be due to incorrect api key.'}`, tagObj: { tags: ['app_scan_steps'] } });
          clearInterval(zapInProgressIntervalId);
          reject(new Error(`Test failure: ${zapError}`));
        } else if (statusValueForRoute === 100) {
          publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `We are finishing scan ${scanId} for the route: "${routeResourceObjectForAscanCallback.id}". Please see the report for further details.`, tagObj: { tags: ['app_scan_steps'] } });

          clearInterval(zapInProgressIntervalId);

          numberOfAlertsForSesh += numberOfAlertsForRoute;
          combinedStatusValueOfRoutesForSesh += statusValueForRoute;
          // status();
          // resolveOfPromiseWithinPromiseOfAscan();

          runStatus = false;
          resolver(`We are finishing scan ${scanId} for route: "${routeResourceObjectForAscanCallback.id}". Please see the report for further details.`);
        }
      }, apiFeedbackSpeed);
    });
  };

  await zaproxy.spider.scanAsUser(contextId, userId, sutBaseUrl, maxChildren)
    .then(
      resp => publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Spider scan as user "${userId}" for url "${sutBaseUrl}", context "${contextId}", with maxChildren "${maxChildren}" was called. Response was: ${JSON.stringify(resp)}`, tagObj: { tags: ['app_scan_steps'] } }),
      err => `Error occured while attempting to scan as user. Error was: ${err.message}`
    );

  for (const routeResourceObject of routeResourceObjectsOfSession) { // eslint-disable-line no-restricted-syntax
    routeResourceObjectForAscanCallback = routeResourceObject;
    const qs = `${routeResourceObject.attributes.attackFields.reduce((queryString, queryParameterObject) => `${queryString}${queryString === '' ? '' : '&'}${queryParameterObject.name}=${queryParameterObject.value}`, '')}`;
    sutAttackUrl = `${sutBaseUrl}${routeResourceObject.id}`;

    // http://172.17.0.2:8080/UI/acsrf/ allows to add csrf tokens.

    await zaproxy.ascan.scan(sutAttackUrl, true, false, '', routeResourceObject.attributes.method, qs) // eslint-disable-line no-await-in-loop
      .then(zapApiAscanScanPerRoute)
      // May need another then here...
      .catch((err) => { // eslint-disable-line no-loop-func
        publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Error occured while attempting to initiate active scan of route: ${routeResourceObject.id}. Error was: ${err.message ? err.message : err}`, tagObj: { tags: ['app_scan_steps'] } });
        // The following error means we haven't got the query string right.
        // Error occured while attempting to initiate active scan. Error was: 400 -
        // {"code":"url_not_found","message":"URL Not Found in the Scan Tree"}
        reject(err); // eslint-disable-line no-undef
      });
  }


  this.zap.numberOfAlertsForSesh(numberOfAlertsForSesh);
});


Then('the vulnerability count should not exceed the build user defined threshold of vulnerabilities known to Zap', function () {
  const { testSession: { id: testSessionId, attributes: { alertThreshold }, relationships: { data: testSessionResourceIdentifiers } } } = this.sut.getProperties(['testSession', 'testRoutes']);
  const routes = testSessionResourceIdentifiers.filter(resourceIdentifier => resourceIdentifier.type === 'route').map(resourceIdentifier => resourceIdentifier.id);

  const numberOfAlertsForSesh = this.zap.numberOfAlertsForSesh();

  if (numberOfAlertsForSesh > alertThreshold) {
    this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Search the generated report for the routes: [${routes}], to see the ${numberOfAlertsForSesh - alertThreshold} vulnerabilities that exceed the Build User defined threshold of "${alertThreshold}" for the session with id "${testSessionId}".`, tagObj: { tags: ['app_scan_steps'] } });
  }

  expect(numberOfAlertsForSesh).to.be.at.most(alertThreshold);
});


// Todo: KC: Should promisify the fs.writeFile.
// The Zap reports are written to file,
After({ tags: '@app_scan' }, async function () {
  const zaproxy = this.zap.getZaproxy();
  const reportDir = this.zap.getProperties('reportDir');
  const { testSession: { id: testSessionId }, reportFormats } = this.sut.getProperties(['testSession', 'reportFormats']);
  const { NowAsFileName } = this.strings;

  const zapApiReportFuncCallback = (response) => {
    const toPrint = ((resp) => {
      if (typeof (resp) === 'object') return { format: 'json', text: JSON.stringify(resp) };
      if (typeof (resp) === 'string' && resp.startsWith('<html>')) return { format: 'html', text: resp };
      if (typeof (resp) === 'string' && resp.includes('# ZAP Scanning Report')) return { format: 'md', text: resp };
      return new Error('Unknown report type encountered');
    })(response);

    return new Promise((resolve, reject) => {
      const reportPath = `${reportDir}report_testSessionId-${testSessionId}_${NowAsFileName()}.${toPrint.format}`;
      this.log.notice(`Writing ${toPrint.format}report to ${reportPath}`, { tags: ['app_scan_steps'] });
      fs.writeFile(reportPath, toPrint.text, (writeFileErr) => {
        if (writeFileErr) {
          this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Error writing ${toPrint.format}report file to disk: ${writeFileErr}`, tagObj: { tags: ['app_scan_steps'] } });
          reject(new Error(`Error writing ${toPrint.format}report file to disk: ${writeFileErr}`));
        }

        this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Done writing ${toPrint.format}report file.`, tagObj: { tags: ['app_scan_steps'] } });
        resolve(`Done writing ${toPrint.format}report file.`);
      });
    });
  };

  this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `About to write reports in the following formats: ${[...reportFormats]}`, tagObj: { tags: ['app_scan_steps'] } });

  const reportPromises = reportFormats.map(format => zaproxy.core[`${format}report`]().then(zapApiReportFuncCallback, err => `Error occured while attempting to create Zap ${format} report. Error was: ${err.message}`));
  await Promise.all(reportPromises);
});
