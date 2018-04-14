

module.exports = {
  method: 'GET',
  path: '/test-results',
  handler: async (request, respToolkit) => { // eslint-disable-line no-unused-vars




    const { model } = request.server.app;
    
    
    // Todo: restResult obviously may not be ready now, so need to deal with this.
    testResult = respToolkit.response(await model.testResult());










    // Send results

    const response = respToolkit.event( { event: 'appTestingResult', id: 4, data: { testingResult: 'test results comming soon' } } );

    setTimeout( () => {
      
      respToolkit.event( { event: 'appTestingResult', id: 2, data: { testingResult: testResult.source } } )
    }, 5000);

    return response;

  }
};

