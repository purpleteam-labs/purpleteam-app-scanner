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

const internals = {};

internals.provisionAppSlaves = (options) => {
  // If we need to stop the slave containers after this/a run, runCuc.js may be the best place.
  const { lambda, numberOfTestSessions } = options;

  const lambdaParamsToProvisionAppSlaves = {
    // https://github.com/awslabs/aws-sam-cli/pull/749
    InvocationType: process.env.NODE_ENV === 'development' ? 'RequestResponse' : 'Event',
    FunctionName: 'provisionAppSlaves',
    Payload: JSON.stringify({ slaveType: 'app', instances: numberOfTestSessions })
  };

  const responseToProvisionAppSlaves = lambda.invoke(lambdaParamsToProvisionAppSlaves);
  const promise = responseToProvisionAppSlaves.promise();
  return { functionName: lambdaParamsToProvisionAppSlaves.FunctionName, responseBodyProp: 'appSlaveServiceNames', promise };
};

internals.provisionSeleniumHubNodes = (options) => {
  const { lambda, browsers: seleniumNodes } = options;
  const lambdaParamsToProvisionSeleniumHubNodes = {
    // https://github.com/awslabs/aws-sam-cli/pull/749
    InvocationType: process.env.NODE_ENV === 'development' ? 'RequestResponse' : 'Event',
    FunctionName: 'provisionSeleniumHubNodes',
    Payload: JSON.stringify(seleniumNodes)
  };

  const responseToProvisionSeleniumHubNodes = lambda.invoke(lambdaParamsToProvisionSeleniumHubNodes);
  const promise = responseToProvisionSeleniumHubNodes.promise();
  return { functionName: lambdaParamsToProvisionSeleniumHubNodes.FunctionName, responseBodyProp: 'seleniumHubServiceName', promise };
};


internals.resolvePromises = async (provisionFeedback) => {
  const { log } = internals;
  const promisesFromLambdas = provisionFeedback.map(p => p.promise);
  const responseBodyPropData = {};

  await Promise.all(promisesFromLambdas).then((resolved) => {
    for (let i = 0; i < provisionFeedback.length; i += 1) {
      const { Payload: payload } = resolved[i];
      if (payload.includes('errorMessage')) log.error(`Error occurred while invoking lambda function "${provisionFeedback[i].functionName}". Response was: ${payload}`, { tags: ['app.parallel'] });
      else responseBodyPropData[provisionFeedback[i].responseBodyProp] = JSON.parse(payload).body[provisionFeedback[i].responseBodyProp];
    }
  }).catch((err) => {
    log.error(`Error occurred while invoking lambda function. Error was: ${err}`, { tags: ['app.parallel'] });
  });

  return responseBodyPropData;
};


internals.provisionViaLambda = (options) => {
  const { cloudFuncOpts, numberOfTestSessions, browsers } = options;
  const { provisionAppSlaves, provisionSeleniumHubNodes, resolvePromises } = internals;
  const lambda = new Lambda(cloudFuncOpts);

  const provisionAppSlavesFeedback = provisionAppSlaves({ lambda, numberOfTestSessions });
  const provisionSeleniumHubNodesFeedback = provisionSeleniumHubNodes({ lambda, browsers });

  return resolvePromises([provisionAppSlavesFeedback, provisionSeleniumHubNodesFeedback]);
};


const parallel = async (runParams) => {
  const { model, model: { log, /* publisher: p, */ createCucumberArgs, cloud: { function: { region, endpoint } } }, sessionsProps } = runParams;
  internals.log = log;
  const numberOfTestSessions = sessionsProps.length;

  const {
    appSlaveServiceNames,
    seleniumHubServiceName
  } = await internals.provisionViaLambda({
    cloudFuncOpts: { region, endpoint },
    numberOfTestSessions,
    browsers: sessionsProps.map(p => p.browser)
  });

  for (let i = 0; i < numberOfTestSessions; i += 1) {
    const cucumberArgs = createCucumberArgs.call(model, sessionsProps[i], appSlaveServiceNames[i], seleniumHubServiceName);

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
