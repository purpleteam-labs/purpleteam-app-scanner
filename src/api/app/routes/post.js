

module.exports = {
  method: 'POST',
  path: '/run-job',
  handler: async (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;
    const { payload: testJob } = request;
    const { data: { attributes: { planOnly } } } = testJob;
    


    
    return planOnly ? respToolkit.response(await model.testPlan(testJob)) : respToolkit.response(await model.runJob(testJob));
 



  }
};


// Maintain default set of cucumber features and steps, to run depending on what build user wants as specified in passed config.

// Runs job passed to it, unless planOnly parameter received, in which case, just return the plan.

// Return low levvel report for orchestrator to compile with other testers and format.

