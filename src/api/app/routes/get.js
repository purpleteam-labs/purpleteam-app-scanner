

module.exports = {
  method: 'GET',
  path: '/test-results',
  handler: async (request, respToolkit) => { // eslint-disable-line no-unused-vars




    const { model } = request.server.app;
    
    

    testResult = respToolkit.response(await model.testResult());










    // Send results

    const response = respToolkit.event( { event: 'result', id: 4, data: { testingResult: 'test results comming soon' } } );

    setTimeout( () => {
      
      respToolkit.event( { event: 'result', id: 2, data: { testingResult: testResult.source } } )
    }, 5000);

    return response;

  }
};

