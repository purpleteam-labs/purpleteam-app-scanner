const { spawn } = require('child_process');
const { Lambda } = require('aws-sdk');
const axios = require('axios');

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

internals.lambdaFuncNames = ['provisionAppSlaves', 'provisionSeleniumStandalones'];

internals.provisionContainers = (options) => {
  // If we need to stop the S2 containers after this/a run, runCuc.js may be the best place,
  // or within an event handler of cucCli of the internals.runTestSession.
  const { lambda, provisionViaLambdaDto, lambdaFunc } = options;
  const lambdaParams = {
    // https://github.com/awslabs/aws-sam-cli/pull/749
    InvocationType: process.env.NODE_ENV === 'development' ? 'RequestResponse' : 'Event',
    FunctionName: lambdaFunc,
    Payload: JSON.stringify({ provisionViaLambdaDto })
  };

  const response = lambda.invoke(lambdaParams);
  const promise = response.promise();
  return { functionName: lambdaFunc, responseBodyProp: 'provisionViaLambdaDto', promise };
};

internals.resolvePromises = async (provisionFeedback) => {
  const { log } = internals;
  const promisesFromLambdas = provisionFeedback.map(p => p.promise);

  const responses = await Promise.all(promisesFromLambdas).catch((err) => {
    log.error(`Unhandled error occurred within a lambda function while attempting to start S2 containers. Error was: ${err.message}`, { tags: ['app.parallel'] });
    throw err;
  });

  let provisionViaLambdaDtoCollection;
  try {
    provisionViaLambdaDtoCollection = responses.map(r => JSON.parse(r.Payload).body.provisionViaLambdaDto);
  } catch (e) {
    log.error(`Unhandled error occurred within a lambda function while attempting to start S2 containers. Error was: ${e.message}`, { tags: ['app.parallel'] });
    throw e;
  }

  provisionViaLambdaDtoCollection.some((e) => {
    if (typeof e.items === 'string' && e.items.includes('Timeout exceeded')) {
      log.error(`Handled error occurred within a lambda function while attempting to start S2 containers. Error was: ${e.items}`, { tags: ['app.parallel'] });
      throw new Error(e.items);
    } else return false;
  });

  return provisionViaLambdaDtoCollection;
};

internals.mergeProvisionViaLambdaDtoCollection = (provisionViaLambdaDtoCollection) => {
  const merge = [];
  const numberOfElementsToMerge = internals.lambdaFuncNames.length;
  let numberOfElementsToMergeCounter = 0;

  while (numberOfElementsToMergeCounter < numberOfElementsToMerge) {
    // eslint-disable-next-line no-loop-func
    merge.push(provisionViaLambdaDtoCollection.map(cV => cV.items[numberOfElementsToMergeCounter]));
    numberOfElementsToMergeCounter += 1;
  }

  const provisionedViaLambdaDto = {};

  provisionedViaLambdaDto.items = merge.map((mCV, mI) => {
    const { browser, testSessionId } = mCV[mI];
    return {
      browser,
      testSessionId,
      appSlaveContainerName: mCV.find(e => e.appSlaveContainerName).appSlaveContainerName,
      seleniumContainerName: mCV.find(e => e.seleniumContainerName).seleniumContainerName
    };
  });

  return provisionedViaLambdaDto;
};

internals.provisionViaLambda = async (options) => {
  const { cloudFuncOpts, provisionViaLambdaDto } = options;
  const { provisionContainers, resolvePromises, mergeProvisionViaLambdaDtoCollection, lambdaFuncNames } = internals;
  const lambda = new Lambda(cloudFuncOpts);

  const collectionOfWrappedProvisionViaLambdaDtos = lambdaFuncNames.map(f => provisionContainers({ lambda, provisionViaLambdaDto, lambdaFunc: f }));

  const provisionViaLambdaDtoCollection = await resolvePromises(collectionOfWrappedProvisionViaLambdaDtos);
  return mergeProvisionViaLambdaDtoCollection(provisionViaLambdaDtoCollection);
};

internals.s2ContainersReady = async ({ model: { slave: { protocol, port } }, provisionedViaLambdaDto }) => {
  const { log } = internals;
  log.notice('Checking whether S2 containers are ready yet', { tags: ['app.parallel'] });
  const containerReadyPromises = provisionedViaLambdaDto.items.map(mCV => [
    axios.get(`${protocol}://${mCV.appSlaveContainerName}:${port}/UI`, { headers: { 'Content-type': 'application/json' } }),
    axios.get(`http://${mCV.seleniumContainerName}:4444/wd/hub/status`, { headers: { 'Content-type': 'application/json' } })
  ]).reduce((accum, rCV) => [...accum, ...rCV], []);

  const results = await Promise.all(containerReadyPromises)
    .catch((err) => {
      log.warning(`Error occurred while testing that s2 containers were up/responsive. Error was: ${err.message}`, { tags: ['app.parallel'] });
      return false;
    });

  if (results) {
    const isReady = {
      appSlave: response => (typeof response.data === 'string') && response.data.includes('ZAP API UI'),
      seleniumContainer: response => response.data.value.ready === true
    };

    const containersThatAreNotReady = results.filter(e => !(isReady.appSlave(e) || isReady.seleniumContainer(e)));

    return !containersThatAreNotReady.length;
  }
  return false;
};

internals.waitForS2ContainersReady = ({ waitForS2ContainersTimeOut: timeOut, provisionedViaLambdaDto }) => new Promise((resolve, reject) => {
  const { s2ContainersReady, model } = internals;
  let countDown = timeOut;
  const decrementInterval = 1000;
  const check = async () => {
    countDown -= decrementInterval;
    if (await s2ContainersReady({ model, provisionedViaLambdaDto })) resolve('S2 containers are ready to take orders');
    else if (countDown < 0) reject(new Error('Timed out while waiting for S2 containers to be ready.'));
    else setTimeout(check, decrementInterval);
  };
  setTimeout(check, decrementInterval);
});

internals.runTestSession = (runableSessionProps) => {
  const { model, log } = internals;
  const cucumberArgs = model.createCucumberArgs(runableSessionProps);

  const cucCli = spawn('node', cucumberArgs, { cwd: process.cwd(), env: process.env, argv0: process.argv[0] });
  model.slavesDeployed = true;

  cucCli.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  cucCli.stderr.on('data', (data) => {
    process.stdout.write(data);
  });

  cucCli.on('exit', (code, signal) => {
    const message = `child process "cucumber Cli" running session with id: "${runableSessionProps.sessionProps.testSession.id}" exited with code: "${code}", and signal: "${signal}"`;
    log.notice(message, { tags: ['app.parallel'] });
  });

  cucCli.on('close', (code) => {
    const message = `"close" event was emitted with code: "${code}" for "cucumber Cli" running session with id "${runableSessionProps.sessionProps.testSession.id}".`;
    log.notice(message, { tags: ['app.parallel'] });
  });

  cucCli.on('error', (err) => {
    process.stdout.write(`Failed to start sub-process. The error was: ${err}`, { tags: ['app.parallel'] });
  });
};

const parallel = async (runParams) => {
  const { model, model: { log, cloud: { function: { region, endpoint } } }, sessionsProps } = runParams;
  const { waitForS2ContainersReady, runTestSession } = internals;
  internals.log = log;
  internals.model = model;

  const provisionViaLambdaDto = {
    items: sessionsProps.map(s => ({
      testSessionId: s.testSession.id,
      browser: s.browser,
      appSlaveContainerName: null,
      seleniumContainerName: null
    }))
  };

  const provisionedViaLambdaDto = await internals.provisionViaLambda({ cloudFuncOpts: { region, endpoint }, provisionViaLambdaDto });

  const runableSessionsProps = provisionedViaLambdaDto.items.map((cV, i) => (
    { sessionProps: sessionsProps[i], slaveHost: cV.appSlaveContainerName, seleniumContainerName: cV.seleniumContainerName }
  ));

  let returnStatus;

  await waitForS2ContainersReady({ waitForS2ContainersTimeOut: 10000, provisionedViaLambdaDto })
    .then((resolved) => {
      log.notice(resolved, { tags: ['app.parallel'] });
      runableSessionsProps.forEach((rSP) => {
        runTestSession(rSP);
      });
      returnStatus = 'App tests are now running.';
    })
    .catch((error) => {
      log.error(error.message, { tags: ['app.parallel'] });
      returnStatus = 'Back-end failure: S2 containers are not ready.';
    });

  return returnStatus;
};

module.exports = parallel;
