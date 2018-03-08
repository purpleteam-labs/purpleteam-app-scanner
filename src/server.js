const Hapi = require('hapi');

const server = Hapi.server({ port: 3000, host: 'localhost' });

server.route({
  method: 'GET',
  path: '/',
  handler: (request, respToolkit) => 'Hello, world!' // eslint-disable-line no-unused-vars
});

server.route({
  method: 'GET',
  path: '/{name}',
  handler: (request, respToolkit) => `Hello, ${encodeURIComponent(request.params.name)}!` // eslint-disable-line no-unused-vars
});

module.exports = server;
