const { spawn } = require('child_process');
const { Lambda } = require('aws-sdk');

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

const parallel = async (runParams) => {
  const { model, model: { log, /* publisher: p, */ createCucumberArgs }, sessionsProps } = runParams;

  const numberOfTestSessions = sessionsProps.length;

  const lambdaParams = {
    FunctionName: 'provisionAppSlaves',
    Payload: JSON.stringify({ slaveType: 'app', instances: numberOfTestSessions })
  };
  const lambda = new Lambda({ region: 'whatever', endpoint: 'http://127.0.0.1:3001' });
  const resp = lambda.invoke(lambdaParams);

  let appSlaveServiceNames;

  await resp.promise()
    .then((resolved) => {
      const { Payload: payload } = resolved;
      ({ body: { appSlaveServiceNames } } = JSON.parse(payload));
    }).catch((err) => {
      log.error(`Error occurred while invoking lambda function "${lambdaParams.FunctionName}". Error was: ${err}`, { tags: ['app.parallel'] });
    });

  let i;
  for (i = 0; i < numberOfTestSessions; i += 1) {
    const cucumberArgs = createCucumberArgs.call(model, sessionsProps[i], appSlaveServiceNames[i]);

    // We may end up having to hava an instance of Zap per test session in order to acheive isolation.
    // Currently reports for all test sessions will be the same.
    // Setting aScannerAttackStrength, aScannerAlertThreshold with single instance Zap will simply be a last one wins scenario.
    // We could also look at using spawnSync, but then, Zap would need to be restarted, which defeats the point of creating a process,
    //   other than the fact that the Cucumber Cli won't run twice.
    // Can I start slave containers from within this container? What's the best way to do this?
    //   Nope, it's not secure, gives full root access of the host to this container: https://github.com/apocas/dockerode/issues/89
    // How to do service discovery rather than hard coding IP and ports in config within one container?


    const cucCli = spawn('node', cucumberArgs, { cwd: process.cwd(), env: process.env, argv0: process.argv[0] });
    model.slavesDeployed = true;

    cucCli.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    cucCli.stderr.on('data', (data) => {
      process.stdout.write(data);
    });

    // eslint-disable-next-line no-loop-func
    cucCli.on('close', (code) => {
      process.stdout
        .write(`child process "cucumber Cli" running session with id "${sessionsProps[i].testSession.id}" exited with code ${code}`, { tags: ['app'] });
    });

    cucCli.on('error', (err) => {
      process.stdout.write(`Failed to start subprocess. The error was: ${err}`, { tags: ['app'] });
    });
  }
};

module.exports = parallel;
