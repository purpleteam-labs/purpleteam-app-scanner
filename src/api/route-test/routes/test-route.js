

module.exports = {
  method: 'POST',
  path: '/test-route',
  handler: (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;
    // Todo: KC: Pass config to model..
    model.initialise('I am a dummy config');

    const cucumber = require('cucumber');

    const clearRequireCache = function clearRequireCache() {
      Object.keys(require.cache).forEach(key => delete require.cache[key])
    }

    // https://github.com/cucumber/cucumber-js/issues/786
    // Details for forking and spawning are:
    //    https://nodejs.org/api/child_process.html
    //    https://medium.freecodecamp.org/node-js-child-processes-everything-you-need-to-know-e69498fe970a
    //    And this one for debugging the additional child process: https://github.com/nodejs/node/issues/8690

    let args = []
      .concat(['node'])
      .concat([`${process.cwd}/node_modules/.bin/cucumber-js`]);
    
    let cucumberCli = new cucumber.Cli({argv: args.concat(['src/features', '-r', 'src/steps', '--exit', `--format=json:${process.cwd()}/test/security/report.txt`]), cwd: process.cwd(), stdout: process.stdout});

    cucumberCli.run()
      .then((succeeded) => {
        console.log(succeeded);
        // clearSupportCodeFns();
        clearRequireCache();
      }).catch((error) => {
      console.log(error);
      });

    return 'test-route handler';
  }
};


