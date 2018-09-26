const { spawn } = require('child_process');

// For complete sessionsProps
// https://github.com/cucumber/cucumber-js/issues/786#issuecomment-372928596

// paste this before your require child_process at the beginning of your main index file.
/*
  (function() {
    var childProcess = require("child_process");
    var oldSpawn = childProcess.spawn;
    function mySpawn() {
        console.log('spawn called');
        console.log(arguments);
        var result = oldSpawn.apply(this, arguments);
        return result;
    }
    childProcess.spawn = mySpawn;
  })();
*/

const parallel = (runParams) => {
  const { model, model: { createCucumberArgs /* , publisher */ }, sessionsProps } = runParams;


  for (const sessionProps of sessionsProps) { // eslint-disable-line no-restricted-syntax
    const cucumberArgs = createCucumberArgs.call(model, sessionProps);


    // We may end up having to hava an instance of Zap per test session in order to acheive isolation.
    // Currently reports for all test sessions will be the same.
    // Setting aScannerAttackStrength, aScannerAlertThreshold with single instance Zap will simply be a last one wins scenario.
    // We could also look at using spawnSync, but then, Zap would need to be restarted, which defeats the point of creating a process,
    //   other than the fact that the Cucumber Cli won't run twice.
    // Can I start slave containers from within this container? What's the best way to do this?
    // How to do service discovery rather than hard coding IP and ports in config within one container?


    const cucCli = spawn('node', cucumberArgs, { cwd: process.cwd(), env: process.env, argv0: process.argv[0] });
    model.slavesDeployed = true;

    cucCli.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    cucCli.stderr.on('data', (data) => {
      process.stdout.write(data);
    });

    cucCli.on('close', (code) => {
      process.stdout
        .write(`child process "cucumber Cli" running session with id "${sessionProps.testSession.id}" exited with code ${code}`, { tags: ['app'] });
    });

    cucCli.on('error', (err) => {
      process.stdout.write(`Failed to start subprocess. The error was: ${err}`, { tags: ['app'] });
    });
  }
};

module.exports = parallel;
