

module.exports = {
  method: 'POST',
  path: '/run-job',
  handler: async (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;
    
    // Todo: check for planOnly.


    let planOnly = false;

    return planOnly ? respToolkit.response(await model.testPlan()) : respToolkit.response(await model.runJob());

     



  }
};


// Maintain default set of cucumber features and steps, to run depending on what build user wants as specified in passed config.

// Runs job passed to it, unless planOnly parameter received, in which case, just return the plan.

// Return low levvel report for orchestrator to compile with other testers and format.

