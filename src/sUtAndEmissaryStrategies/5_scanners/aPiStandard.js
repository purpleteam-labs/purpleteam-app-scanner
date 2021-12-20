// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

const Scanners = require('./strategy');

class ApiStandard extends Scanners {
  #sutPropertiesSubSet;
  #fileName = 'aPiStandard';

  constructor({ log, publisher, baseUrl, sutPropertiesSubSet, zAp /* Other props */ }) {
    super({ log, publisher, baseUrl, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
  }

  async configure() {
    const methodName = 'configure';
    const { id: testSessionId, attributes: { aScannerAttackStrength, aScannerAlertThreshold } } = this.#sutPropertiesSubSet;
    const scanPolicyName = '';
    const policyId = '';
    // If using the Zap API via browser to desktop Zap, the following doesn't enable 0. but it does via code.
    const scanners = [...(this.#sutPropertiesSubSet.attributes.soap ? [90026, 90029] : []), 0, 7, 40009, 40018, 90019, 90020, 20019, 30001, 30002, 40003, 40008, 50000, 90021, 90023];
    let aScanners;

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    // Doc: https://www.zaproxy.org/faq/how-can-you-use-zap-to-scan-apis/
    // Doc: https://www.zaproxy.org/blog/2017-04-03-exploring-apis-with-zap/
    // This strategy is modelled on the following:
    //   Docker script: zap-api-scan.py (https://github.com/zaproxy/zaproxy/blob/main/docker/zap-api-scan.py) which is included in the docer files (https://github.com/zaproxy/zaproxy/tree/main/docker).
    //     Doc: https://www.zaproxy.org/blog/2017-06-19-scanning-apis-with-zap/
    //       As you can see here: https://www.zaproxy.org/blog/2017-06-19-scanning-apis-with-zap/#specifying-values
    //       Havning the formhandler accessible via the Zap API would be very helpful: https://github.com/zaproxy/zaproxy/issues/3346
    //     Doc: https://www.zaproxy.org/docs/docker/api-scan/#configuration-file
    //     Which adds two scripts:
    //     * Alert_on_HTTP_Response_Code_Errors.js: https://github.com/zaproxy/zaproxy/blob/main/docker/scripts/scripts/httpsender/Alert_on_HTTP_Response_Code_Errors.js
    //     * Alert_on_Unexpected_Content_Types.js: https://github.com/zaproxy/zaproxy/blob/main/docker/scripts/scripts/httpsender/Alert_on_Unexpected_Content_Types.js
    //     And loads the API-Minimal.policy: https://github.com/zaproxy/zaproxy/blob/main/docker/policies/API-Minimal.policy
    //     All scanners are listed here: https://github.com/zaproxy/zaproxy/blob/main/docs/scanners.md

    // Load the two httpsender scripts
    // Loaded scanners are based on: https://github.com/zaproxy/zaproxy/blob/main/docker/policies/API-Minimal.policy

    const scripts = [{
      scriptName: 'Alert_on_HTTP_Response_Code_Errors.js',
      fileName: '/home/zap/.ZAP_D/scripts/scripts/httpsender/Alert_on_HTTP_Response_Code_Errors.js'
    }, {
      scriptName: 'Alert_on_Unexpected_Content_Types.js',
      fileName: '/home/zap/.ZAP_D/scripts/scripts/httpsender/Alert_on_Unexpected_Content_Types.js'
    }];
    await Promise.all(scripts.map(async (s) => {
      await this.zAp.aPi.script.load({ scriptName: s.scriptName, scriptType: 'httpsender', scriptEngine: 'Oracle Nashorn', fileName: s.fileName })
        .then((resp) => {
          this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Loaded: "httpsender" script: "${s.scriptName}" into the Emissary, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        }).catch((err) => {
          const buildUserErrorText = `Error occurred while attempting to load the httpsender script: "${s.scriptName}" into the Emissary`;
          const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
          this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
          this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
          throw new Error(adminErrorText);
        });
    }));
    await Promise.all(scripts.map(async (s) => {
      await this.zAp.aPi.script.enable({ scriptName: s.scriptName })
        .then((resp) => {
          this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Enabled: "httpsender" script: "${s.scriptName}" into the Emissary, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        }).catch((err) => {
          const buildUserErrorText = `Error occurred while attempting to load the httpsender script: "${s.scriptName}" into the Emissary`;
          const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
          this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
          this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
          throw new Error(adminErrorText);
        });
    }));

    await this.zAp.aPi.ascan.disableAllScanners({ scanPolicyName })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Disable all active scanners was called, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to disable all active scanners, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.ascan.enableScanners({ ids: scanners, scanPolicyName })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Enable API active scanners was called, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to enable API active scanners, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
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

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Setting attack strengths and alert thresholds for the ${enabledAScanners.length} enabled API active scanners for Test Session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    // Zap can't handle this many requests concurrently, so we're using a sequential for loop rather than map.
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
      const scannersStateForBuildUser = result.scanners.reduce((all, each) => `${all}\nname: ${each.name.padEnd(50)}, id: ${each.id.padEnd(6)}, enabled: ${each.enabled.padEnd(5)}, attackStrength: ${each.attackStrength.padEnd(7)}, alertThreshold: ${each.alertThreshold.padEnd(7)}`, '');
      // This is for the Build User and the PurpleTeam admin:
      this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `\n\nThe following are all the active scanners available with their current state, for Test Session with id: "${testSessionId}":\n${scannersStateForBuildUser}\n`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName, 'pt-build-user'] } });
      // This is for the PurpleTeam admin only:
      this.log.info(`\n\nThe following are all the active scanners available with their current state, for Test Session with id: "${testSessionId}":\n\n${JSON.stringify(result, null, 2)}\n\n`, { tags: [`pid-${process.pid}`, this.#fileName, methodName, 'pt-admin'] });
    };
    await this.zAp.aPi.ascan.viewScanners({ scanPolicyName, policyId }).then(zApApiPrintEnabledAScanersFuncCallback, (err) => `Error occurred while attempting to get the configured active scanners for display, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`);
  }
}

module.exports = ApiStandard;
