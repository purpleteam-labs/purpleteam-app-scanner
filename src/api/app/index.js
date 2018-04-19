const App = require('./models/app');
const routes = require('./routes');

const applyRoutes = (server) => {
  // Plugin with multiple routes.
  server.route(routes);
};

module.exports = {
  name: 'appDomainPlugin',
  version: '1.0.0',
  register: async (server, options) => {
    // Todo: KC: Configure model.
    const model = new App(options);
    server.app.model = model; // eslint-disable-line no-param-reassign
    applyRoutes(server);
    console.log(`The options passed to appDomainPlugin were: ${options}.`); // eslint-disable-line no-console
  }

};
