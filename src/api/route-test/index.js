const RouteTest = require('./models/route-test');
const routes = require('./routes');

const applyRoutes = (server) => {
  // Plugin with multiple routes.
  server.route([...routes]);
};

module.exports = {
  name: 'routeTestDomainPlugin',
  version: '1.0.0',
  register: async (server, options) => {
    // Todo: KC: Configure model.
    const model = new RouteTest();
    server.app.model = model; // eslint-disable-line no-param-reassign
    applyRoutes(server);
    console.log(`The options passed to routeTestDomainPlugin were: ${options}.`); // eslint-disable-line no-console
  }

};
