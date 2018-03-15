

module.exports = {
  method: 'POST',
  path: '/test-route',
  handler: (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;
    // Todo: KC: Pass config to model..
    model.initialise('I am a dummy config');

    let cucumber = require('cucumber');

    let args = []
      .concat(['/home/kim/.nvm/versions/node/v8.9.4/bin/node'])
      .concat(['/home/kim/Source/purpleteam-app-scanner/node_modules/.bin/cucumber-js']);

    let cucumberCli = new cucumber.Cli({argv: args.concat(['src/features', '-r', 'src/steps', '--exit']), cwd: process.cwd(), stdout: process.stdout});

    // Todo: KC: Need to limit the nuuber of child node.js processes. 

    const pipeStdinStdoutStderrFromChildToParent = true;

    // fork provides not only the ability to receive but also send messages to the child process.    
    const { fork } = require('child_process');
    const cucCli = fork('./node_modules/.bin/cucumber-js', ['src/features', '-r', 'src/steps'], {silent: pipeStdinStdoutStderrFromChildToParent, execArgv: ['--inspect=9223']});

    //const { spawn } = require('child_process');
    //const cucCli = spawn('node', ['./node_modules/.bin/cucumber-js', 'src/features', '-r', 'src/steps']);

    cucCli.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);      
    })

    cucCli.on('message', (msg) => {
      console.log(`message from child: ${msg}`);
    })

    cucCli.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    })

    cucCli.on('close', (code) => {
      console.log(`child process exited with code ${code}`)
    })

    return 'test-route handler';
  }
};

