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

const Hapi = require('@hapi/hapi');
const config = require('config/config');
const { hapiEventHandler } = require('src/plugins/');
const app = require('src/api/app');

const host = config.get('host.host');
const server = Hapi.server({ port: config.get('host.port'), host });
const log = require('purpleteam-logger').init(config.get('logger'));
const messagePublisher = require('src/publishers/messagePublisher').init({ log, redis: config.get('redis.clientCreationOptions') });
const strings = require('src/strings');

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
      emissary: config.get('emissary'),
      cucumber: config.get('cucumber'),
      results: config.get('results'),
      publisher: messagePublisher,
      runType: config.get('runType'),
      cloud: config.get('cloud'),
      debug: config.get('debug'),
      s2Containers: config.get('s2Containers')
    }
  }
];

module.exports = {

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
