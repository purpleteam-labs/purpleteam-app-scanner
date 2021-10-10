// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of PurpleTeam.

// PurpleTeam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// PurpleTeam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this PurpleTeam project. If not, see <https://www.gnu.org/licenses/>.

const { /* Before, */ Given, When, Then /* , setDefaultTimeout */, After } = require('@cucumber/cucumber');

const internals = {
  contextId: null,
  userId: null,
  scanId: null,
  aScanners: null
};

/*
Before(() => {
  // Run before *every* scenario, no matter which feature or file.
  console.log('Im currently in a Before');

});
*/

Given('a new Test Session based on each Build User supplied appScanner resourceObject', async function () {
  const sutBaseUrl = this.sut.baseUrl();
  const { findElementThenClick, findElementThenSendKeys, checkAndNotifyBuildUserIfAnyKnownBrowserErrors } = this.sut.getBrowser();
  const { authentication: { route: loginRoute, usernameFieldLocater, passwordFieldLocater, submit, expectedPageSourceSuccess }, testSession: { id, attributes: { username, password } } } = this.sut.getProperties(['authentication', 'testSession']);

  // Todo: KC: Allow for no loginRoute, usernameFieldLocater, passwordFieldLocater, user, pass
  await this.initialiseBrowser();
  const webDriver = this.sut.getBrowser().getWebDriver();
  await webDriver.getWindowHandle();
  await webDriver.get(`${sutBaseUrl}${loginRoute}`);
  await checkAndNotifyBuildUserIfAnyKnownBrowserErrors(id);
  await findElementThenSendKeys({ name: usernameFieldLocater, value: username, visible: true }, id);
  await findElementThenSendKeys({ name: passwordFieldLocater, value: password, visible: true }, id);
  await findElementThenClick(submit, id, expectedPageSourceSuccess);
});

Given('each Build User supplied route of each appScanner resourceObject is navigated', async function () {
  const baseUrl = this.sut.baseUrl();
  const { findElementThenClick, findElementThenClear, findElementThenSendKeys } = this.sut.getBrowser();
  const { testSession: { id, relationships: { data: testSessionResourceIdentifiers } }, testRoutes: routeResourceObjects } = this.sut.getProperties(['testSession', 'testRoutes']);
  const routes = testSessionResourceIdentifiers.filter((resourceIdentifier) => resourceIdentifier.type === 'route').map((resourceIdentifier) => resourceIdentifier.id);
  const routeResourceObjectsOfSession = routeResourceObjects.filter((routeResourceObject) => routes.includes(routeResourceObject.id));
  const webDriver = this.sut.getBrowser().getWebDriver();

  await routeResourceObjectsOfSession.reduce(async (accum, routeResourceObject) => {
    await accum;

    await webDriver.sleep(1000)
      .then(() => {
        this.publisher.pubLog({ testSessionId: id, logLevel: 'info', textData: `Navigating route id "${routeResourceObject.id}" of Test Session id "${id}".`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });
        return webDriver.get(`${baseUrl}${routeResourceObject.id}`);
      })
      .then(() => webDriver.sleep(1000))
      .then(() => Promise.all(routeResourceObject.attributes.attackFields.map((attackField) => findElementThenClear(attackField, id))))
      .then(() => Promise.all(routeResourceObject.attributes.attackFields.map((attackField) => findElementThenSendKeys(attackField, id))))
      .then(() => findElementThenClick(routeResourceObject.attributes.submit, id))
      .then(() => webDriver.sleep(1000))
      .catch((err) => {
        this.publisher.pubLog({ testSessionId: id, logLevel: 'error', textData: err.message, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });
        throw new Error(`Error occurred while navigating route "${routeResourceObject.id}" of testSession with id "${id}". The error was: ${err}`);
      });

    return [...(await accum), routeResourceObject];
  }, []);
});

Given('a new scanning session based on each Build User supplied appScanner resourceObject', async function () {
  const { testSession: { id: testSessionId }, context: { name: contextName } } = this.sut.getProperties(['testSession', 'context']);
  const zaproxy = this.zap.getZaproxy();

  await zaproxy.context.newContext(contextName).then(
    (resp) => {
      internals.contextId = resp.contextId;
      this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Created new Zap context with a contextId of: ${internals.contextId}, correlating with the contextName of: ${contextName}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });
    },
    (error) => this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Error occurred while attempting to create a new Zap context using contextName: "${contextName}", message was: ${error.message}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } })
  );
});

Given('the application is spidered for each appScanner resourceObject', async function () {
  const { contextId } = internals;
  const sutBaseUrl = this.sut.baseUrl();
  const {
    authentication: { route: loginRoute, usernameFieldLocater, passwordFieldLocater },
    loggedInIndicator,
    loggedOutIndicator,
    testSession: { id: testSessionId, attributes: { username, password }, relationships: { data: testSessionResourceIdentifiers } },
    context: { name: contextName }
  } = this.sut.getProperties(['authentication', 'loggedInIndicator', 'loggedOutIndicator', 'testSession', 'context']);
  const { percentEncode } = this.sut.getBrowser();

  const loggedInOutIndicator = {
    command: loggedInIndicator ? 'setLoggedInIndicator' : 'setLoggedOutIndicator',
    value: loggedInIndicator || loggedOutIndicator
  };

  const { maxDepth, threadCount, maxChildren } = this.zap.getProperties('spider');
  const zaproxy = this.zap.getZaproxy();
  const enabled = true;
  const authenticationMethod = 'formBasedAuthentication';

  await zaproxy.spider.setOptionMaxDepth(maxDepth)
    .then(
      (resp) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set the spider max depth, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (err) => `Error occurred while attempting to set the spider max depth, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
    );
  await zaproxy.spider.setOptionThreadCount(threadCount)
    .then(
      (resp) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set the spider thread count, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (err) => `Error occurred while attempting to set the spider thread count, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
    );

  const routes = testSessionResourceIdentifiers.filter((resourceIdentifier) => resourceIdentifier.type === 'route').map((resourceIdentifier) => resourceIdentifier.id);
  const contextTargets = [sutBaseUrl, `${sutBaseUrl}${loginRoute}`, ...routes.map((r) => `${sutBaseUrl}${r}`)];

  contextTargets.reduce(async (accum, cT) => {
    await accum;

    await zaproxy.context.includeInContext(contextName, cT)
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Added URI "${cT}" to Zap context "${contextName}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to add URI "${cT}" to Zap context "${contextName}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });
        throw new Error(errorText);
      });
  }, []);

  // Only the 'userName' onwards must be URL encoded. URL encoding entire line doesn't (or at least didn't used to) work.
  await zaproxy.authentication.setAuthenticationMethod(contextId, authenticationMethod, `loginUrl=${sutBaseUrl}${loginRoute}&loginRequestData=${usernameFieldLocater}%3D%7B%25username%25%7D%26${passwordFieldLocater}%3D%7B%25password%25%7D`)
    .then(
      (resp) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set authentication method to "${authenticationMethod}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (err) => `Error occurred while attempting to set authentication method to "${authenticationMethod}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
    );
  await zaproxy.authentication[loggedInOutIndicator.command](contextId, loggedInOutIndicator.value)
    .then(
      (resp) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set logged in indicator "${loggedInIndicator}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (err) => `Error occurred while attempting to set logged in indicator to "${loggedInIndicator}", for test session with id: "${testSessionId}". Error was: ${err.message}.`
    );
  await zaproxy.forcedUser.setForcedUserModeEnabled(enabled)
    .then(
      (resp) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set forced user mode enabled to "${enabled}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (err) => `Error occurred while attempting to set forced user mode enabled to "${enabled}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
    );
  await zaproxy.users.newUser(contextId, username).then(
    (resp) => {
      internals.userId = resp.userId;
      this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set the newUser "${username}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });
    },
    (err) => `Error occurred while attempting to set the newUser "${username}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
  );
  await zaproxy.forcedUser.setForcedUser(contextId, internals.userId)
    .then(
      (resp) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set forced user with Id "${internals.userId}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (err) => `Error occurred while attempting to set forced user "${internals.userId}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
    );
  await zaproxy.users.setAuthenticationCredentials(contextId, internals.userId, `username=${percentEncode(username)}&password=${percentEncode(password)}`)
    .then(
      (resp) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set authentication credentials, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (err) => `Error occurred while attempting to set authentication credentials, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
    );
  await zaproxy.users.setUserEnabled(contextId, internals.userId, enabled)
    .then(
      (resp) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set user enabled on user with id "${internals.userId}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (err) => `Error occurred while attempting to set user enabled with id "${internals.userId}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
    );
  await zaproxy.spider.scan(sutBaseUrl, maxChildren)
    .then(
      (resp) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Spider scan initiated for "${sutBaseUrl}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (err) => `Error occurred while attempting to initiate spider scan for "${sutBaseUrl}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
    );
});

Given('all active scanners are disabled', async function () {
  const { id: testSessionId } = this.sut.getProperties('testSession');
  const zaproxy = this.zap.getZaproxy();
  const scanPolicyName = null;
  await zaproxy.ascan.disableAllScanners(scanPolicyName)
    .then(
      (resp) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Disable all active scanners was called, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (err) => `Error occurred while attempting to disable all active scanners, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
    );
});

Given('all active scanners are enabled', async function () {
  const zaproxy = this.zap.getZaproxy();
  const { id: testSessionId, attributes: { aScannerAttackStrength, aScannerAlertThreshold } } = this.sut.getProperties('testSession');

  const scanPolicyName = null;
  const policyid = null;
  const domXssScannerId = 40026;

  await zaproxy.ascan.enableAllScanners(scanPolicyName)
    .then(
      (resp) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Enable all active scanners was called, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (err) => `Error occurred while attempting to enable all active scanners, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
    );
  // Disable DOM XSS active scanner because on some routes it can take far too long (30 minutes on NodeGoat /memos).
  // The DOM XSS was a new add-on in Zap 2.10.0 https://www.zaproxy.org/docs/desktop/releases/2.10.0/#new-add-ons
  // If you query the scanners: http://zap:8080/HTML/ascan/view/scanners/ you'll also see that it is beta quality when writing this (2021-06-03)
  await zaproxy.ascan.disableScanners(domXssScannerId, scanPolicyName)
    .then(
      (resp) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Disable DOM XSS active scanner was called, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (err) => `Error occurred while attempting to disable DOM XSS active scanner, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
    );
  await zaproxy.ascan.scanners(scanPolicyName, policyid).then(
    (resp) => {
      internals.aScanners = resp.scanners;
      this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Obtained all ${internals.aScanners.length} active scanners from Zap, for Test Session with id: "${testSessionId}\n".`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });
    },
    (err) => `Error occurred while attempting to get all active scanners from Zap, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`
  );
  // Zap seems to have some sort of ordering problem if we use a Promise.all
  // Optimising this would only save milliseconds, & the entire testing process takes minutes, ignoring this chance for micro-optimisation.

  const enabledAScanners = internals.aScanners.filter((e) => e.enabled === 'true');

  this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Setting attack strengths and alert thresholds for the ${enabledAScanners.length} enabled active scanners for Test Session with id: "${testSessionId}\n".`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });

  for (const ascanner of enabledAScanners) { // eslint-disable-line no-restricted-syntax
    // eslint-disable-next-line no-await-in-loop
    await zaproxy.ascan.setScannerAttackStrength(ascanner.id, aScannerAttackStrength, scanPolicyName).then(
      (result) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Attack strength has been set, for Test Session with id: "${testSessionId}": ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (error) => this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Error occurred while attempting to set the attack strength for active scanner, for Test Session with id: "${testSessionId}": { id: ${ascanner.id}, name: ${ascanner.name}}. The error was: ${error.message}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } })
    );
    // eslint-disable-next-line no-await-in-loop
    await zaproxy.ascan.setScannerAlertThreshold(ascanner.id, aScannerAlertThreshold, scanPolicyName).then(
      (result) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Alert threshold has been set, for Test Session with id: "${testSessionId}": ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } }),
      (error) => this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Error occurred while attempting to set the alert threshold for active scanner, for Test Session with id: "${testSessionId}": { id: ${ascanner.id}, name: ${ascanner.name}. The error was: ${error.message}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } })
    );
  }

  const zapApiPrintEnabledAScanersFuncCallback = (result) => { // eslint-disable-line no-unused-vars
    const scannersStateForBuildUser = result.scanners.reduce((all, each) => `${all}\nname: ${each.name.padEnd(50)}, id: ${each.id.padEnd(6)}, enabled: ${each.enabled}, attackStrength: ${each.attackStrength.padEnd(6)}, alertThreshold: ${each.alertThreshold.padEnd(6)}`, '');
    // This is for the Build User and the PurpleTeam admin:
    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `\n\nThe following are all the active scanners available with their current state, for Test Session with id: "${testSessionId}":\n${scannersStateForBuildUser}\n`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps', 'pt-build-user'] } });
    // This is for the PurpleTeam admin only:
    this.log.info(`\n\nThe following are all the active scanners available with their current state, for Test Session with id: "${testSessionId}":\n\n${JSON.stringify(result, null, 2)}\n\n`, { tags: [`pid-${process.pid}`, 'app_scan_steps', 'pt-admin'] });
  };
  await zaproxy.ascan.scanners(scanPolicyName, policyid).then(zapApiPrintEnabledAScanersFuncCallback, (err) => `Error occurred while attempting to get the configured active scanners for display, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`);
});

When('the active scan is run', async function () {
  const sutBaseUrl = this.sut.baseUrl();
  const { testSession: { id: testSessionId, relationships: { data: testSessionResourceIdentifiers } }, testRoutes: routeResourceObjects } = this.sut.getProperties(['testSession', 'testRoutes']);
  const routes = testSessionResourceIdentifiers.filter((resourceIdentifier) => resourceIdentifier.type === 'route').map((resourceIdentifier) => resourceIdentifier.id);
  const routeResourceObjectsOfSession = routeResourceObjects.filter((routeResourceObject) => routes.includes(routeResourceObject.id));
  const { contextId, userId } = internals;

  const { apiFeedbackSpeed, spider: { maxChildren } } = this.zap.getProperties(['apiFeedbackSpeed', 'spider']);
  const zaproxy = this.zap.getZaproxy();
  const { log, publisher } = this;

  let numberOfAlertsForSesh = 0;
  let combinedStatusValueOfRoutesForSesh = 0;
  let sutAttackUrl;
  // let currentRouteResourceObject;
  // let resolveOfPromiseWithinPromiseOfAscan
  let routeResourceObjectForAscanCallback;

  const zapApiSpiderScanAsUser = (zapResult) => {
    const spiderScanId = zapResult.scanAsUser;
    let runStatus = true;
    const spiderScanAsUserLogText = `Spider scan as user "${userId}" for url "${sutBaseUrl}", context "${contextId}", with scanAsUser Id "${spiderScanId}" with maxChildren "${maxChildren}" was called, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(zapResult)}.`;
    log.info(spiderScanAsUserLogText, { tags: [`pid-${process.pid}`, 'app_scan_steps'] });
    publisher.publish(testSessionId, spiderScanAsUserLogText);
    return new Promise((resolve, reject) => {
      let statusValueForSpiderScanAsUser = 'no status yet';
      let zapError;
      let zapInProgressIntervalId;

      async function status() {
        if (!runStatus) return;
        await zaproxy.spider.status(spiderScanId).then(
          (result) => {
            if (result) statusValueForSpiderScanAsUser = parseInt(result.status, 10);
            else statusValueForSpiderScanAsUser = undefined;
          },
          (error) => {
            if (error) zapError = (error.error.code === 'ECONNREFUSED') ? error.message : '';
          }
        );
      }
      zapInProgressIntervalId = setInterval(() => { // eslint-disable-line prefer-const
        status();
        if ((zapError && statusValueForSpiderScanAsUser !== 100) || (statusValueForSpiderScanAsUser === undefined)) {
          publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Cancelling test. Zap API is unreachable. ${zapError ? `Zap Error: ${zapError}` : 'No status value available, may be due to incorrect api key.'}`, tagObj: { tags: ['app_scan_steps'] } });
          clearInterval(zapInProgressIntervalId);
          reject(new Error(`Test failure: ${zapError}`));
        } else if (statusValueForSpiderScanAsUser === 100) {
          const spiderFinishingScanAsUserLogText = `The spider is finishing scan as user "${userId}" for url "${sutBaseUrl}", context "${contextId}", with scanAsUser Id "${spiderScanId}", for Test Session with id: "${testSessionId}".`;
          log.info(spiderFinishingScanAsUserLogText, { tags: [`pid-${process.pid}`, 'app_scan_steps'] });
          publisher.publish(testSessionId, spiderFinishingScanAsUserLogText);
          clearInterval(zapInProgressIntervalId);
          runStatus = false;
          resolve();
        }
      }, apiFeedbackSpeed);
    });
  };

  const zapApiAscanScanPerRoute = (zapResult) => {
    internals.scanId = zapResult.scan;
    let runStatus = true;
    return new Promise((resolver, reject) => {
      let statusValueForRoute = 'no status yet';
      let zapError;
      let zapInProgressIntervalId;
      publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Active scan initiated for Test Session with id: "${testSessionId}", route: "${routeResourceObjectForAscanCallback.id}". Response was: ${JSON.stringify(zapResult)}.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });

      let numberOfAlertsForRoute = 0;
      async function status() {
        if (!runStatus) return;
        await zaproxy.ascan.status(internals.scanId).then(
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
              publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Scan ${internals.scanId} is ${`${statusValueForRoute}%`.padEnd(4)} complete with ${`${numberOfAlertsForRoute}`.padEnd(3)} alerts for route: "${routeResourceObjectForAscanCallback.id}", for Test Session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });
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
          publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Cancelling test. Zap API is unreachable. ${zapError ? `Zap Error: ${zapError}` : 'No status value available, may be due to incorrect api key.'}`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });
          clearInterval(zapInProgressIntervalId);
          reject(new Error(`Test failure: ${zapError}`));
        } else if (statusValueForRoute === 100) {
          publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Finishing scan ${internals.scanId} for the route: "${routeResourceObjectForAscanCallback.id}", for Test Session with id: "${testSessionId}". Please see the report for further details.`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });
          clearInterval(zapInProgressIntervalId);
          numberOfAlertsForSesh += numberOfAlertsForRoute;
          combinedStatusValueOfRoutesForSesh += statusValueForRoute;
          // status();
          // resolveOfPromiseWithinPromiseOfAscan();

          runStatus = false;
          resolver(`Finishing scan ${internals.scanId} for route: "${routeResourceObjectForAscanCallback.id}". Please see the report for further details.`);
        }
      }, apiFeedbackSpeed);
    });
  };

  await zaproxy.spider.scanAsUser(contextId, userId, sutBaseUrl, maxChildren)
    .then(zapApiSpiderScanAsUser)
    .catch((err) => {
      publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Error occurred in spider while attempting to scan as user. Error was: ${err.message ? err.message : err}`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });
      throw err;
    });

  for (const routeResourceObject of routeResourceObjectsOfSession) { // eslint-disable-line no-restricted-syntax
    routeResourceObjectForAscanCallback = routeResourceObject;
    const postData = `${routeResourceObject.attributes.attackFields.reduce((queryString, queryParameterObject) => `${queryString}${queryString === '' ? '' : '&'}${queryParameterObject.name}=${queryParameterObject.value}`, '')}`;
    sutAttackUrl = `${sutBaseUrl}${routeResourceObject.id}`;
    publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The sutAttackUrl was: ${sutAttackUrl}. The post data was: ${postData}. The contextId was ${contextId}`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });

    // http://172.17.0.2:8080/UI/acsrf/ allows to add csrf tokens.

    await zaproxy.ascan.scan(sutAttackUrl, true, false, '', routeResourceObject.attributes.method, postData, contextId) // eslint-disable-line no-await-in-loop
      .then(zapApiAscanScanPerRoute)
      // May need another then here...
      .catch((err) => { // eslint-disable-line no-loop-func
        publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Error occurred while attempting to initiate active scan of route: ${routeResourceObject.id}. Error was: ${err.message ? err.message : err}`, tagObj: { tags: [`pid-${process.pid}`, 'app_scan_steps'] } });
        // The following error means we haven't got the query string right.
        // Error occurred while attempting to initiate active scan. Error was: 400 -
        // {"code":"url_not_found","message":"URL Not Found in the Scan Tree"}
        throw err;
      });
  }

  this.zap.numberOfAlertsForSesh(numberOfAlertsForSesh);
});

Then('the vulnerability count should not exceed the Build User defined threshold of vulnerabilities known to Zap', function () {
  const { testSession: { id: testSessionId, attributes: { alertThreshold }, relationships: { data: testSessionResourceIdentifiers } } } = this.sut.getProperties(['testSession', 'testRoutes']);
  const routes = testSessionResourceIdentifiers.filter((resourceIdentifier) => resourceIdentifier.type === 'route').map((resourceIdentifier) => resourceIdentifier.id);

  const numberOfAlertsForSesh = this.zap.numberOfAlertsForSesh();

  if (numberOfAlertsForSesh > alertThreshold) {
    this.publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Search the generated report for the routes: [${routes}], to see the ${numberOfAlertsForSesh - alertThreshold} vulnerabilities that exceed the Build User defined alert threshold of "${alertThreshold}" for the Test Session with id "${testSessionId}".`, tagObj: { tags: ['app_scan_steps'] } });
  }

  if (numberOfAlertsForSesh > alertThreshold) throw new Error(`The number of alerts (${numberOfAlertsForSesh}) should be no greater than the alert threshold (${alertThreshold}).`);
});

After({ tags: '@app_scan' }, async function () {
  const { testSession: { id: testSessionId } } = this.sut.getProperties(['testSession']);
  await this.zap.createReports({ testSessionId });
});
