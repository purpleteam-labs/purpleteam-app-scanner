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


const { promises: fsPromises } = require('fs');

const config = require(`${process.cwd()}/config/config`); // eslint-disable-line import/no-dynamic-require
// const crypto = require('crypto');

const rndBytes = require('util').promisify(require('crypto').randomBytes);
const EmissaryAuthentication = require('./strategy');

class ScriptLink extends EmissaryAuthentication {
  #browser;
  #sutPropertiesSubSet;
  #setContextId;
  #setUserId;
  #emissaryPropertiesSubSet;
  #fileName = 'scriptLink';

  constructor({ log, publisher, baseUrl, browser, sutPropertiesSubSet, setContextId, setUserId, emissaryPropertiesSubSet, zAp }) {
    super({ log, publisher, baseUrl, zAp });
    this.#browser = browser;
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
    this.#setContextId = setContextId;
    this.#setUserId = setUserId;
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
  }

  async configure() {
    const methodName = 'configure';
    const {
      authentication: { route: loginRoute },
      loggedInIndicator,
      loggedOutIndicator,
      testSession: { id: testSessionId, attributes: { username, excludedRoutes } },
      context: { name: contextName }
    } = this.#sutPropertiesSubSet;
    const { percentEncode } = this.#browser;

    const loggedInOutIndicator = {
      command: loggedInIndicator ? 'setLoggedInIndicator' : 'setLoggedOutIndicator',
      value: loggedInIndicator || loggedOutIndicator,
      secondParamName: loggedInIndicator ? 'loggedInIndicatorRegex' : 'loggedOutIndicatorRegex'
    };

    const { uploadDir: emissaryUploadDir, spider: { maxDepth, threadCount } } = this.#emissaryPropertiesSubSet;
    const { dir: appTesterUploadDir } = config.get('upload');
    const enabled = true;
    const authenticationMethod = 'scriptBasedAuthentication';
    let contextId;
    let userId;
    const script = {
      name: 'link',
      fileName: 'link.js',
      type: 'authentication',
      engine: 'Oracle Nashorn',
      sourcePath: `${process.cwd()}/src/sUtAndEmissaryStrategies/3_emissaryAuthentication/scripts/link.js`,
      params: () => `scriptName=${script.name}&Login_URL=${percentEncode(`${this.baseUrl}${loginRoute}`)}`
    };

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    // Need to copy file as unique name so that another Test Session is unable to delete it before we load it into the Emissary.
    let rndFilePrefix = '';
    await rndBytes(4)
      .then((buf) => {
        rndFilePrefix = buf.toString('hex');
      })
      .catch((err) => {
        const adminErrorText = `Error (non fatal) occurred while attempting to get randomBytes for file prefix, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      });
    await fsPromises.copyFile(script.sourcePath, `${appTesterUploadDir}${rndFilePrefix}-${script.fileName}`)
      .then(() => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Script: "${script.fileName}" was successfully copied to the App Tester upload directory.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to copy the script: "${script.fileName}" to the App Tester upload directory for the Emissary consumption`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    // console.log(`${emissaryUploadDir}${rndFilePrefix}-${script.fileName}`);
    await this.zAp.aPi.script.load({ scriptName: script.name, scriptType: script.type, scriptEngine: script.engine, fileName: `${emissaryUploadDir}${rndFilePrefix}-${script.fileName}`, scriptDescription: `Used by the ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}"` })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Loaded script: "${script.fileName}" into the Emissary, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      }).catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to load the script: "${script.fileName}" into the Emissary`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    await fsPromises.rm(`${appTesterUploadDir}${rndFilePrefix}-${script.fileName}`)
      .then(() => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Removed script: "${script.fileName}" from the App Tester upload directory.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to remove the script: "${script.fileName}" from the App Tester upload directory after loading into the Emissary`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      });
    await this.zAp.aPi.context.newContext({ contextName })
      .then((resp) => {
        contextId = resp.contextId;
        this.#setContextId(contextId); // Todo: Test that this assignes to the SUT properties.
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Created new Zap context with a contextId of: "${contextId}", correlating with the contextName of: "${contextName}".`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to create a new Zap context using contextName: "${contextName}", message was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.spider.setOptionMaxDepth({ Integer: maxDepth })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set the spider max depth to: "${maxDepth}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set the spider max depth, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.spider.setOptionThreadCount({ Integer: threadCount })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set the spider thread count to: "${threadCount}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set the spider thread count, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });

    const contextTarget = `${this.baseUrl}.*`;

    await this.zAp.aPi.context.includeInContext({ contextName, regex: contextTarget })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Added URI: "${contextTarget}" to Zap include-in-context: "${contextName}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to add URI: "${contextTarget}" to Zap include-in-context: "${contextName}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });

    excludedRoutes.reduce(async (accum, eR) => {
      await accum;

      await this.zAp.aPi.context.excludeFromContext({ contextName, regex: eR })
        .then((resp) => {
          this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Added URI: "${eR}" to Zap exclude-from-context: "${contextName}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        })
        .catch((err) => {
          const errorText = `Error occurred while attempting to add URI: "${eR}" to Zap exclude-from-context: "${contextName}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
          this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
          throw new Error(errorText);
        });
    }, []);

    // Only the 'userName' onwards must be URL encoded. URL encoding entire line doesn't (or at least didn't used to) work.
    await this.zAp.aPi.authentication.setAuthenticationMethod({ contextId, authMethodName: authenticationMethod, authMethodConfigParams: script.params() })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set authentication method for contextId: "${contextId}" to: "${authenticationMethod}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set authentication method to "${authenticationMethod}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.authentication[loggedInOutIndicator.command]({ contextId, [loggedInOutIndicator.secondParamName]: loggedInOutIndicator.value })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `${loggedInOutIndicator.command} for contextId: "${contextId}" to: "${loggedInOutIndicator.value}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to: ${loggedInOutIndicator.command} to: "${loggedInOutIndicator.value}", for test session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });

    await this.zAp.aPi.users.newUser({ contextId, name: username })
      .then((resp) => {
        userId = resp.userId;
        this.#setUserId(userId); // Todo: Test that this assignes to the SUT properties.
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set the newUser: "${username}" of contextId: "${contextId}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set the newUser "${username}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.users.setUserEnabled({ contextId, userId, enabled })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set user enabled on user with id: "${userId}", of contextId: "${contextId}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set user enabled with id: "${userId}", of contextId: "${contextId}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.forcedUser.setForcedUser({ contextId, userId })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set forced user with Id: "${userId}" of contextId: "${contextId}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set forced user: "${userId}", of contextId: "${contextId}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.forcedUser.setForcedUserModeEnabled({ boolean: enabled })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set forced user mode enabled to: "${enabled}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set forced user mode enabled to: "${enabled}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
  }
}

module.exports = ScriptLink;
