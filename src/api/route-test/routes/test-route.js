module.exports = {
  method: 'POST',
  path: '/test-route',
  handler: (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;
    // Todo: KC: Pass config to model..
    model.initialise('I am a dummy config');
    return 'test-route handler';
  }
};

