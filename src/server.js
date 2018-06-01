const Hapi = require('hapi');
const config = require('config/config');
const app = require('src/api/app');
const server = Hapi.server({ port: config.get('host.port'), host: config.get('host.ip') });
const logger = require('purpleteam-logger').init(config.get('logger'));

const reporters = {
  development: {
    consoleReporter: [{
      module: 'good-squeeze',
      name: 'Squeeze',
      args: [{
        log: '*',
        request: '*',
        response: '*',
        error: '*'
      }]}, {
        module: 'good-console'
      },
      'stdout'
    ]
  },
  production: {
    consoleReporter: [{
      module: 'good-squeeze',
      name: 'Squeeze',
      args: [{
        log: {include: '*', exclude: ['debug', 'info']}, // Using tags as log levels, checkout the syslog levels we use for Winston in the config.
        request: '*',
        response: '*',
        error: '*'
      }]}, {
        module: 'good-squeeze',
        name: 'SafeJson'
      },
      'stdout'
    ]
  }
};

const infrastructuralPlugins = [
  require('susie'),
  {
    plugin: require('good'),
      options: {
        reporters: reporters[process.env.NODE_ENV] 
    }
  }
];

const domainPlugins = [
  {
    plugin: app,
    options: {
      logger,
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
    logger.info('Server registered.', {tags: ['startup']});
  },
  start: async () => {
    await server.start();
    logger.info('Server started.', {tags: ['startup']});
    return server;
  }

};
