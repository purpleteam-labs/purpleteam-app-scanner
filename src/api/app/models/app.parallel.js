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
  // If we need to stop the slave containers after this/a run, runCuc.js may be the best place.
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
    log.error(`Error occurred while invoking lambda function. Error was: ${err}`, { tags: ['app.parallel'] });
  });

  const provisionViaLambdaDtoCollection = responses.map(r => JSON.parse(r.Payload).body.provisionViaLambdaDto);
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

const s2ContainersReady = async ({ model: { slave: { protocol, port } }, provisionedViaLambdaDto }) => {
  
  const containerReadyPromises = provisionedViaLambdaDto.items.map(mCV => [
    
      // isReady: response => response.data.includes('ZAP API UI'),
      axios.get(`${protocol}://${mCV.appSlaveContainerName}:${port}/UI`, { headers: { 'Content-type': 'application/json' } })
    ,
      // isReady: response => response.data.value.ready === true,
      axios.get(`http://${mCV.seleniumContainerName}:4444/wd/hub/status`, { headers: { 'Content-type': 'application/json' } })
    
  ]).reduce((accum, rCV) => [...accum, ...rCV], []);

  const results = await Promise.all(containerReadyPromises);

  const isReady = {
    appSlave: (response) => {
      if (typeof response.data === 'string') return response.data.includes('ZAP API UI');
    },
    seleniumContainer: (response) => {
      return response.data.value.ready === true;
    }
  };

  const containersThatAreNotReady = results.filter((e) => {
    return !(isReady.appSlave(e) || isReady.seleniumContainer(e));
  });

  return !containersThatAreNotReady.length;
  

};

const parallel = async (runParams) => {
  const { model, model: { log, /* publisher: p, */ createCucumberArgs, cloud: { function: { region, endpoint } } }, sessionsProps } = runParams;
  internals.log = log;

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

  const ready = await s2ContainersReady({ model, provisionedViaLambdaDto });

  if (ready) {
    runableSessionsProps.forEach((rSP, i) => {
      const cucumberArgs = createCucumberArgs.call(model, rSP);

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
    });
  }
};

module.exports = parallel;
