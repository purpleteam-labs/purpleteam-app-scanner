

module.exports = {
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
    
    let cucumberCli = new cucumber.Cli({argv: args.concat(['src/features', '-r', 'src/steps', '--exit', `--format=json:${process.cwd()}/test/security/report.txt`]), cwd: process.cwd(), stdout: process.stdout});

    let resp;

    // https://robbg.io/blog/2017-03-31-async-await-and-node-fs/
    // http://2ality.com/2017/05/util-promisify.html
    const fs = require('fs');
    const { promisify } = require('util');
    const readFileAsync = promisify(fs.readFile);

    await cucumberCli.run()
    .then((succeeded) => {
      console.log(succeeded);
      // clearSupportCodeFns();
      clearRequireCache();
        
    }).catch((error) => {
      console.log(error);
    });
    
    await readFileAsync(`${process.cwd()}/test/security/report.txt`, {encoding: 'utf8'})
    .then((fileText) => {
      resp = respToolkit.response(fileText);
    
    });

    return `test-route handler. ${resp.source}`;
  }
};


