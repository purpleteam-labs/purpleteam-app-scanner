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


const Scanners = require('./strategy');

class BrowserAppStandard extends Scanners {
  #sutPropertiesSubSet;
  #fileName = 'browserAppStandard';

  constructor({ log, publisher, baseUrl, sutPropertiesSubSet, zAp }) {
    super({ log, publisher, baseUrl, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
  }

  async configure() {
    const methodName = 'configure';
    const { id: testSessionId, attributes: { aScannerAttackStrength, aScannerAlertThreshold } } = this.#sutPropertiesSubSet;
    const scanPolicyName = '';
    const policyId = '';
    const domXssScannerId = 40026;
    let aScanners;

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    await this.zAp.aPi.ascan.disableAllScanners({ scanPolicyName })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Disable all active scanners was called, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to disable all active scanners, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.ascan.enableAllScanners({ scanPolicyName })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Enable all active scanners was called, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to enable all active scanners, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    // Disable DOM XSS active scanner because on some routes it can take far too long (30 minutes on NodeGoat /memos).
    // The DOM XSS was a new add-on in Zap 2.10.0 https://www.zaproxy.org/docs/desktop/releases/2.10.0/#new-add-ons
    // If you query the scanners: http://zap:8080/HTML/ascan/view/scanners/ you'll also see that it is beta quality when writing this (2021-06-03)
    await this.zAp.aPi.ascan.disableScanners({ ids: domXssScannerId, scanPolicyName })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Disable DOM XSS active scanner was called, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to disable DOM XSS active scanner, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.ascan.viewScanners({ scanPolicyName, policyId })
      .then((resp) => {
        aScanners = resp.scanners;
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Obtained all ${aScanners.length} active scanners from Zap, for Test Session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to get all active scanners from Zap, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });

    const enabledAScanners = aScanners.filter((e) => e.enabled === 'true');

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Setting attack strengths and alert thresholds for the ${enabledAScanners.length} enabled active scanners for Test Session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    for (const ascanner of enabledAScanners) { // eslint-disable-line no-restricted-syntax
      // eslint-disable-next-line no-await-in-loop
      await this.zAp.aPi.ascan.setScannerAttackStrength({ id: ascanner.id, attackStrength: aScannerAttackStrength, scanPolicyName }).then(
        (result) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Attack strength has been set, for Test Session with id: "${testSessionId}": ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } }),
        (error) => this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Error occurred while attempting to set the attack strength for active scanner, for Test Session with id: "${testSessionId}": { id: ${ascanner.id}, name: ${ascanner.name}}. The error was: ${error.message}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } })
      );
      // eslint-disable-next-line no-await-in-loop
      await this.zAp.aPi.ascan.setScannerAlertThreshold({ id: ascanner.id, alertThreshold: aScannerAlertThreshold, scanPolicyName }).then(
        (result) => this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Alert threshold has been set, for Test Session with id: "${testSessionId}": ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } }),
        (error) => this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Error occurred while attempting to set the alert threshold for active scanner, for Test Session with id: "${testSessionId}": { id: ${ascanner.id}, name: ${ascanner.name}. The error was: ${error.message}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } })
      );
    }

    const zApApiPrintEnabledAScanersFuncCallback = (result) => { // eslint-disable-line no-unused-vars
      const scannersStateForBuildUser = result.scanners.reduce((all, each) => `${all}\nname: ${each.name.padEnd(50)}, id: ${each.id.padEnd(6)}, enabled: ${each.enabled}, attackStrength: ${each.attackStrength.padEnd(6)}, alertThreshold: ${each.alertThreshold.padEnd(6)}`, '');
      // This is for the Build User and the PurpleTeam admin:
      this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `\n\nThe following are all the active scanners available with their current state, for Test Session with id: "${testSessionId}":\n${scannersStateForBuildUser}\n`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName, 'pt-build-user'] } });
      // This is for the PurpleTeam admin only:
      this.log.info(`\n\nThe following are all the active scanners available with their current state, for Test Session with id: "${testSessionId}":\n\n${JSON.stringify(result, null, 2)}\n\n`, { tags: [`pid-${process.pid}`, this.#fileName, methodName, 'pt-admin'] });
    };
    await this.zAp.aPi.ascan.viewScanners({ scanPolicyName, policyId }).then(zApApiPrintEnabledAScanersFuncCallback, (err) => `Error occurred while attempting to get the configured active scanners for display, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`);
  }
}

module.exports = BrowserAppStandard;
