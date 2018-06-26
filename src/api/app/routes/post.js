

module.exports = [{
  method: 'POST',
  path: '/test-plan',
  handler: async (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;
    const { payload: testJob } = request;
    
    return respToolkit.response(await model.testPlan(testJob));
  }
}, {
  method: 'POST',
  path: '/run-job',
  handler: async (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;
    const { payload: testJob } = request;
    
    return respToolkit.response(await model.runJob(testJob));


  }
}];


// Maintain default set of cucumber features and steps, to run depending on what build user wants as specified in passed config.


// Return low levvel report for orchestrator to compile with other testers and format.

