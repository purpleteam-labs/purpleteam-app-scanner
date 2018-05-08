

const config = require('../../config/config');
const { Before, Given, When, Then } = require('cucumber')
debugger;
const { expect } = require('code');
const { By } = require('selenium-webdriver');
const fs = require('fs');


Before(() => {
  // 
  console.log('Im currently in a Before');

});


Given('a new test session based on each build user supplied testSession', async function () {

  const sutBaseUrl = this.sut.baseUrl();
  const { route, usernameFieldLocater, passwordFieldLocater, username, password } = this.sut.getProperties('sutAuthentication');
  await this.initialiseBrowser();
  const webDriver = this.sut.getBrowser().getWebDriver();

  webDriver.getWindowHandle();
  webDriver.get(`${sutBaseUrl}${route}`);
  webDriver.sleep(1000);
  webDriver.findElement(By.name(usernameFieldLocater)).sendKeys(username);
  webDriver.findElement(By.name(passwordFieldLocater)).sendKeys(password);
  webDriver.sleep(1000);
  webDriver.findElement({
    tagName: 'button',
    type: 'submit'
  }).click();

});


Given('each build user supplied route of each testSession is navigated', async function () {
  
  // Todo: KC: Obviously need to iterate the array
  const sutAttackUrl = `${this.sut.baseUrl}${this.sut.getProperties('route')}`;
  const routeFields = this.sut.getProperties('routeFields');
  const webDriver = this.sut.getBrowser().getWebDriver();
  // Todo: KC: Fix hard coded sleeps.
  webDriver.sleep(1000);
  webDriver.get(sutAttackUrl)
  webDriver.sleep(1000);
  Promise.all(routeFields.attackFields.map( attackField => webDriver.findElement(By.name(attackField.name)).sendKeys(attackField.value) ));
  webDriver.findElement(By.name(routeFields.submit)).click();
  webDriver.sleep(1000);

});




Given('a new scanning session based on each build user supplied testSession', () => {});
Given('each build user supplied route of each testSession is spidered', () => {});
Given('all scanners are disabled', () => {});

Given('the following scanners are enabled', (dataTable) => {

  console.log(dataTable);

  
  // Todo: Use the table.
});





When('the active scanner is run', async function () {

  const sutBaseUrl = this.sut.baseUrl();
  const { route, username, password, alertThreshold } = this.sut.getProperties(['sutAuthentication', 'routeFields']);

  const { apiFeedbackSpeed, apiKey } = this.zap.getProperties(['apiFeedbackSpeed', 'apiKey']);
  const zaproxy = this.zap.getZaproxy();
  const sutAttackUrl = `${sutBaseUrl}${route}`;

  const contextId = 1;
  const maxChildren = 1;
  const alertThreshold = 3;
  let numberOfAlerts;
  let userId;
  let scanId;
  let zapInProgressIntervalId;


  // Todo: Let's do something with resultsFromAllAsyncSeriesFunctions.
  const onCompletion = (outcome) => {

    console.log(outcome); // eslint-disable-line no-console
    if (numberOfAlerts > alertThreshold) {
      // eslint-disable-next-line no-console
      console.log(`Search the generated report for "/${route}" to see the ${numberOfAlerts - alertThreshold} vulnerabilities that exceed the Build User defined threshold of: ${alertThreshold}`);
    }    
    expect(numberOfAlerts).to.be.at.most(alertThreshold);
    
  };




  await (async () => {
    await (function newContext() {
      return new Promise((resolve, reject) => {
        zaproxy.context.newContext('NodeGoat Context', apiKey, (err, resp) => {
          console.log(`Response from newContext: ${JSON.stringify(resp)}`); // eslint-disable-line no-console
          if (err) reject(err);
          else resolve(resp);
        });
      });
    }()).catch(error => console.log(`Error: ${JSON.stringify(error)}`)); // eslint-disable-line no-console
    await (function spider() {
      return new Promise((resolve, reject) => {
        zaproxy.spider.scan(sutBaseUrl, maxChildren, apiKey, (err, resp) => {
          console.log(`Response from spider: ${JSON.stringify(resp)}`); // eslint-disable-line no-console
          if (err) reject(err);
          else resolve(resp);
        });
      });
    }()).catch(error => console.log(`Error: ${JSON.stringify(error)}`)); // eslint-disable-line no-console
    await (function includeInZapContext() {
      return new Promise((resolve, reject) => {
        // Inform Zap how to authenticate itself.
        zaproxy.context.includeInContext('NodeGoat Context', sutBaseUrl, apiKey, (err, resp) => {
          console.log(`Response from includeInContext: ${JSON.stringify(resp)}`); // eslint-disable-line no-console
          if (err) reject(err);
          else resolve(resp);
        });
      });
    }()).catch(error => console.log(`Error: ${JSON.stringify(error)}`)); // eslint-disable-line no-console
    await (function setAuthenticationMethod() {
      return new Promise((resolve, reject) => {
        zaproxy.authentication.setAuthenticationMethod(
          contextId,
          'formBasedAuthentication',
          // Only the 'userName' onwards must be URL encoded. URL encoding entire line doesn't work.
          `loginUrl=${sutBaseUrl}login&loginRequestData=userName%3D%7B%25username%25%7D%26password%3D%7B%25password%25%7D%26_csrf%3D`,
          apiKey,
          (err, resp) => {
            console.log(`Response from setAuthenticationMethod: ${JSON.stringify(resp)}`); // eslint-disable-line no-console
            if (err) reject(err);
            else resolve(resp);
          }
        );
      });
    }()).catch(error => console.log(`Error: ${JSON.stringify(error)}`)); // eslint-disable-line no-console
    await (function setLoggedInIndicator() {
      return new Promise((resolve, reject) => {
        // contextId, loggedInIndicatorRegex
        zaproxy.authentication.setLoggedInIndicator(
          contextId,
          '<p>Moved Temporarily. Redirecting to <a href="/dashboard">/dashboard</a></p>',
          apiKey,
          (err, resp) => {
            console.log(`Response from setLoggedInIndicator: ${JSON.stringify(resp)}`); // eslint-disable-line no-console
            if (err) reject(err);
            else resolve(resp);
          }
        );
      });
    }()).catch(error => console.log(`Error: ${JSON.stringify(error)}`)); // eslint-disable-line no-console
    await (function setForcedUserModeEnabled() {
      return new Promise((resolve, reject) => {
        const enabled = true;
        zaproxy.forcedUser.setForcedUserModeEnabled(enabled, apiKey, (err, resp) => {
          console.log(`Response from setForcedUserModeEnabled: ${JSON.stringify(resp)}`); // eslint-disable-line no-console
          if (err) reject(err);
          else resolve(resp);
        });
      });
    }()).catch(error => console.log(`Error: ${JSON.stringify(error)}`)); // eslint-disable-line no-console
    await (function newUser() {
      return new Promise((resolve, reject) => {
        zaproxy.users.newUser(contextId, username, apiKey, (err, resp) => {
          ({ userId } = resp);
          console.log(`Response from newUser: ${JSON.stringify(resp)}`); // eslint-disable-line no-console
          if (err) reject(err);
          else resolve(resp);
        });
      });
    }()).catch(error => console.log(`Error: ${JSON.stringify(error)}`)); // eslint-disable-line no-console
    await (function setForcedUser() {
      return new Promise((resolve, reject) => {
        zaproxy.forcedUser.setForcedUser(contextId, userId, apiKey, (err, resp) => {
          console.log(`Response from setForcedUser: ${JSON.stringify(resp)}`); // eslint-disable-line no-console
          if (err) reject(err);
          else resolve(resp);
        });
      });
    }()).catch(error => console.log(`Error: ${JSON.stringify(error)}`)); // eslint-disable-line no-console
    await (function setAuthenticationCredentials() {
      return new Promise((resolve, reject) => {
        zaproxy.users.setAuthenticationCredentials(
          contextId,
          userId,
          `username=${username}&password=${password}`,
          apiKey,
          (err, resp) => {
            console.log(`Response from setAuthenticationCredentials: ${JSON.stringify(resp)}`); // eslint-disable-line no-console
            if (err) reject(err);
            else resolve(resp);
          }
        );
      });
    }()).catch(error => console.log(`Error: ${JSON.stringify(error)}`)); // eslint-disable-line no-console
    await (function setUserEnabled() { // User should already be enabled?
      return new Promise((resolve, reject) => {
        const enabled = true;
        zaproxy.users.setUserEnabled(contextId, userId, enabled, apiKey, (err, resp) => {
          console.log(`Response from setUserEnabled: ${JSON.stringify(resp)}`); // eslint-disable-line no-console
          if (err) reject(err);
          else resolve(resp);
        });
      });
    }()).catch(error => console.log(`Error: ${JSON.stringify(error)}`)); // eslint-disable-line no-console
    await (function spiderAsUserForRoot() {
      return new Promise((resolve, reject) => {
        zaproxy.spider.scanAsUser(sutBaseUrl, contextId, userId, maxChildren, apiKey, (err, resp) => {
          console.log(`Response from scanAsUser: ${JSON.stringify(resp)}`); // eslint-disable-line no-console
          if (err) reject(err);
          else resolve(resp);
        });
      });
    }()).catch(error => console.log(`Error: ${JSON.stringify(error)}`)); // eslint-disable-line no-console
    await (function activeScan() {
      return new Promise((resolve, reject) => {
        zaproxy.ascan.scan(
          sutAttackUrl,
          true,
          false,
          '',
          'POST',
          'firstName=JohnseleniumJohn&lastName=DoeseleniumDoe&ssn=seleniumSSN&dob=12/23/5678&bankAcc=seleniumBankAcc&bankRouting=0198212#&address=seleniumAddress&_csrf=&submit=', // http://172.17.0.2:8080/UI/acsrf/ allows to add csrf tokens.
          apiKey,
          (err, resp) => {
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
                console.log('About to write report.'); // eslint-disable-line no-console
                zaproxy.core.htmlreport(apiKey, (htmlreportErr, htmlreportResp) => {
                  const date = new Date();
                  const reportPath = `${__dirname}/report_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}.html`;
                  console.log(`Writing report to ${reportPath}`); // eslint-disable-line no-console
                  fs.writeFile(reportPath, htmlreportResp, (writeFileErr) => {
                    if (writeFileErr) console.log(`Error writing report file to disk: ${writeFileErr}`); // eslint-disable-line no-console
                  });
                  resolve('Done writing report file.');
                });
              }
            }, apiFeedbackSpeed);
          }
        );
      });
    }()).then(outcome => onCompletion(outcome));
  })();



});




Then('the vulnerability count should not exceed the build user decided threshold of vulnerabilities known to Zap', () => {});
Then('the Zap report is written to file', () => {});
