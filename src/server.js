// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of purpleteam.

// purpleteam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// purpleteam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with purpleteam. If not, see <https://www.gnu.org/licenses/>.

const Hapi = require('@hapi/hapi');
const good = require('@hapi/good');
const config = require('config/config');
const app = require('src/api/app');

const server = Hapi.server({ port: config.get('host.port'), host: config.get('host.host') });
const log = require('purpleteam-logger').init(config.get('logger'));
const messagePublisher = require('src/publishers/messagePublisher').init({ log, redis: config.get('redis.clientCreationOptions') });
const strings = require('src/strings');

// hapi-good-winstone: https://github.com/alexandrebodin/hapi-good-winston
//    default levels: https://github.com/alexandrebodin/hapi-good-winston/blob/master/lib/index.js
const reporters = {
  local: {
    winstonReporter: [{
      module: 'hapi-good-winston',
      name: 'goodWinston',
      args: [log, { levels: { ops: 'debug' } }]
    }]
  },
  cloud: {
    winstonReporter: [{
      module: 'hapi-good-winston',
      name: 'goodWinston',
      args: [log, { levels: { ops: 'notice', response: 'notice', log: 'notice', request: 'notice' } }]
    }]
  }
};


const infrastructuralPlugins = [
  {
    plugin: good,
    options: { reporters: reporters[process.env.NODE_ENV] }
  }
];

const domainPlugins = [
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
      debug: config.get('debug')
    }
  }
];


module.exports = {

  registerPlugins: async () => {
    // Todo: KC: Add host header as `vhost` to the routes of the optional options object passed to `server.register`.
    // https://hapijs.com/tutorials/plugins#user-content-registration-options
    await server.register(infrastructuralPlugins.concat(domainPlugins));
    log.info('Server registered.', { tags: ['startup'] });
  },
  start: async () => {
    await server.start();
    log.info('Server started.', { tags: ['startup'] });
    return server;
  }

};
