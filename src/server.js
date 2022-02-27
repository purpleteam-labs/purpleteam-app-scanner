// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import Hapi from '@hapi/hapi';
import { init as initPtLogger } from 'purpleteam-logger';
import config from '../config/config.js';
import { hapiEventHandler } from './plugins/index.js';
import app from './api/app/index.js';
import strings from './strings/index.js';

const log = initPtLogger(config.get('logger'));
const server = Hapi.server({ port: config.get('host.port'), host: config.get('host.host') });

const plugins = [
  {
    plugin: hapiEventHandler,
    options: {
      log,
      logLevels: config.getSchema()._cvtProperties.logger._cvtProperties.level.format, // eslint-disable-line no-underscore-dangle
      processMonitoring: config.get('processMonitoring')
    }
  },
  {
    plugin: app,
    options: {
      log,
      strings,
      debug: config.get('debug'),
      emissary: config.get('emissary'),
      cucumber: config.get('cucumber'),
      results: config.get('results'),
      cloud: config.get('cloud'),
      s2Containers: config.get('s2Containers')
    }
  }
];

export default {
  registerPlugins: async () => {
    // Todo: KC: Add host header as `vhost` to the routes of the optional options object passed to `server.register`.
    // https://hapijs.com/tutorials/plugins#user-content-registration-options
    await server.register(plugins);
    log.info('Server registered.', { tags: ['startup'] });
  },
  start: async () => {
    await server.start();
    log.info('Server started.', { tags: ['startup'] });
    return server;
  }
};
