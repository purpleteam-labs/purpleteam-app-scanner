const Hapi = require('hapi');
const config = require('config/config');
const app = require('src/api/app');
const server = Hapi.server({ port: config.get('host.port'), host: config.get('host.ip') });
const log = require('purpleteam-logger').init(config.get('logger'));

// hapi-good-winstone: https://github.com/alexandrebodin/hapi-good-winston
//    default levels: https://github.com/alexandrebodin/hapi-good-winston/blob/master/lib/index.js
const reporters = {
  development: {
    winstonReporter: [{
      module: 'hapi-good-winston',
      name: 'goodWinston',
      args: [log, {levels: {ops: 'debug'}}]
    }]
  },
  production: {
    winstonReporter: [{
      module: 'hapi-good-winston',
      name: 'goodWinston',
      args: [log, {levels: {ops: 'notice', response: 'notice', log: 'notice', request: 'notice'}}]
    }]
  }
};


const infrastructuralPlugins = [
  require('susie'),
  {
    plugin: require('good'),
    options: { reporters: reporters[process.env.NODE_ENV]}
  }
];

const domainPlugins = [
  {
    plugin: app,
    options: {
      log,
      slave: config.get('slave'),
      cucumber: config.get('cucumber'),
      results: config.get('results')
    }
  }
];


module.exports = {

  registerPlugins: async () => {
    // Todo: KC: Add host header as `vhost` to the routes of the optional options object passed to `server.register`.
    // https://hapijs.com/tutorials/plugins#user-content-registration-options
    await server.register(infrastructuralPlugins.concat(domainPlugins));
    log.info('Server registered.', {tags: ['startup']});
  },
  start: async () => {
    await server.start();
    log.info('Server started.', {tags: ['startup']});
    return server;
  }

};
