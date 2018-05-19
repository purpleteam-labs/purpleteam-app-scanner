const Hapi = require('hapi');
const config = require('config/config');
const app = require('src/api/app');

const server = Hapi.server({ port: config.get('host.port'), host: config.get('host.ip') });

const infrastructuralPlugins = [
  require('susie')
];
const domainPlugins = [
  {
    plugin: app,
    options: {
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
  },
  start: async () => {
    await server.start();
    return server;
  }

};
