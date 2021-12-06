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

const rndBytes = require('util').promisify(require('crypto').randomBytes);
const SitesTreePopulation = require('./strategy');

// Doc: https://www.zaproxy.org/docs/desktop/addons/graphql-support/
// Doc: https://www.zaproxy.org/blog/2020-08-28-introducing-the-graphql-add-on-for-zap/

class GraphQl extends SitesTreePopulation {
  #emissaryPropertiesSubSet;
  #fileName = 'graphQl';

  constructor({ log, publisher, baseUrl, sutPropertiesSubSet, setContextId, emissaryPropertiesSubSet, zAp }) {
    super({ publisher, baseUrl, sutPropertiesSubSet, setContextId, zAp });
    this.log = log;
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
  }

  async #importDefinitionFromUrl({ importUrl, testSessionId }) {
    const methodName = '#importDefinitionFromUrl';
    await this.zAp.aPi.graphql.importUrl({ url: importUrl, endurl: this.baseUrl })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Loaded GraphQL definition from URL into the Emissary, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      }).catch((err) => {
        const buildUserErrorText = 'Error occurred while attempting to load the GraphQL definition from URL into the Emissary';
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
  }

  async #importDefinitionFromFileContent({ importFileContentBase64, testSessionId }) {
    const methodName = '#importDefinitionFromFileContent';
    const { dir: appTesterUploadDir } = config.get('upload');
    const emissaryUploadDir = this.#emissaryPropertiesSubSet;

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
    const fileNameNoPrefix = 'GraphQlDefinition';
    const fileNameWithPrefix = `${rndFilePrefix}-${fileNameNoPrefix}`;
    const buff = Buffer.from(importFileContentBase64, 'base64');

    await fsPromises.writeFile(`${appTesterUploadDir}${fileNameWithPrefix}`, buff)
      .then(() => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `GraphQL definition: "${fileNameNoPrefix}" was successfully written to the App Tester upload directory.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to write the GraphQL definition from file: "${fileNameNoPrefix}" to the App Tester upload directory for the Emissary consumption`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    await this.zAp.aPi.graphql.importFile({ file: `${emissaryUploadDir}${fileNameWithPrefix}`, endurl: this.baseUrl })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Loaded GraphQL definition from file: "${fileNameNoPrefix}" into the Emissary, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      }).catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to load the GraphQL definition from file: "${fileNameNoPrefix}" into the Emissary`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    await fsPromises.rm(`${appTesterUploadDir}${fileNameWithPrefix}`)
      .then(() => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Removed GraphQL definition file: "${fileNameNoPrefix}" from the App Tester upload directory.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to remove the GraphQL definition file: "${fileNameNoPrefix}" from the App Tester upload directory after loading into the Emissary`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      });
  }

  async #setOptions({ testSessionId, options }) {
    const methodName = '#setOptions';
    const opts = Object.entries(options);
    const key = 0;
    const val = 1;

    const paramName = (value) => {
      if (Number.isInteger(value)) return 'Integer';
      if (typeof value === 'boolean') return 'Boolean';
      return 'String';
    };

    await Promise.all(opts.map(async (o) => {
      await this.zAp.aPi.graphql[o[key]]({ [paramName(o[val])]: o[val] })
        .then((resp) => {
          this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set GraphQL option: "${o[key]}" to: "${o[val]}", in the Emissary, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        }).catch((err) => {
          const buildUserErrorText = `Error occurred while attempting to set GraphQL option: "${o[key]}" to: "${o[val]}": in the Emissary`;
          const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
          this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
          this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
          throw new Error(adminErrorText);
        });
    }));
  }

  async populate() {
    const methodName = 'populate';
    const {
      testSession: { id: testSessionId, attributes: { graphQl: { importFileContentBase64, importUrl, ...options } } },
      context: { name: contextName }
    } = this.sutPropertiesSubSet;

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    await this.setContextIdForSut(testSessionId, contextName);

    importUrl ? await this.#importDefinitionFromUrl({ importUrl, testSessionId }) : await this.#importDefinitionFromFileContent({ importFileContentBase64, testSessionId });

    await this.#setOptions({ testSessionId, options });
  }
}

module.exports = GraphQl;

