

module.exports = [{
  method: 'POST',
  path: '/test-route',
  handler: async (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;
    // Todo: KC: Pass config to model..
    model.initialise('I am a dummy config');

    const cucumber = require('cucumber');

    const clearRequireCache = function clearRequireCache() {
      Object.keys(require.cache).forEach(key => delete require.cache[key])
    }

    let args = []
      .concat(['node'])
      .concat([`${process.cwd}/node_modules/.bin/cucumber-js`]);
    

    // https://robbg.io/blog/2017-03-31-async-await-and-node-fs/
    // http://2ality.com/2017/05/util-promisify.html
    const fs = require('fs');
    const { promisify } = require('util');
    const readFileAsync = promisify(fs.readFile);


    let testPlan;

    // Read testplan

    await readFileAsync(`${process.cwd()}/src/features/simple_math.feature`, {encoding: 'utf8'})
    .then((features) => {
      testPlan = respToolkit.response(features);
    
    });



    // Run tests

    // Todo: KC: Convert existing profile test to cucumber. 
    let cucumberCli = new cucumber.Cli({argv: args.concat(['src/features', '-r', 'src/steps', '--exit', `--format=json:${process.cwd()}/test/security/report.txt`]), cwd: process.cwd(), stdout: process.stdout});






    await cucumberCli.run()
    .then((succeeded) => {
      console.log(succeeded);
      // clearSupportCodeFns();
      clearRequireCache();
        
    }).catch((error) => {
      console.log(error);
    });
    










    // Return testplan

    return `Testplan:\n${testPlan.source}`;




  }
}, {
  method: 'GET',
  path: '/test-results',
  handler: async (request, respToolkit) => { // eslint-disable-line no-unused-vars


    const fs = require('fs');
    const { promisify } = require('util');
    const readFileAsync = promisify(fs.readFile);

    let testResult;

    // Read results

    await readFileAsync(`${process.cwd()}/test/security/report.txt`, {encoding: 'utf8'})
    .then((fileText) => {
      testResult = respToolkit.response(fileText);    
    });

    //let testingResult = testResult.source;








    // Send results

    const response = respToolkit.event( { event: 'result', id: 4, data: { testingResult: 'test results comming soon' } } );

    setTimeout( () => {
      
      respToolkit.event( { event: 'result', id: 2, data: { testingResult: testResult.source } } )
    }, 5000);

    return response;

  }
}];


// Maintain default set of cucumber features and steps, to run depending on what build user wants as specified in passed config.

// Runs job passed to it, unless planOnly parameter received, in which case, just return the plan.

// Return low levvel report for orchestrator to compile with other testers and format.

