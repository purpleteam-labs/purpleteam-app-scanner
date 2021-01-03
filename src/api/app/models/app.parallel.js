// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of purpleteam.

// purpleteam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// purpleteam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with purpleteam. If not, see <https://www.gnu.org/licenses/>.

const { spawn } = require('child_process');
// Doc: https://docs.aws.amazon.com/lambda/latest/dg/API_Invoke.html
// Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html
// Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ServiceDiscovery.html
const { Lambda, ServiceDiscovery } = require('aws-sdk');
const axios = require('axios');
const HttpProxyAgent = require('http-proxy-agent');
const Bourne = require('@hapi/bourne');

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

const internals = {
  log: undefined,
  debug: undefined,
  nextChildProcessInspectPort: undefined,
  model: undefined,
  numberOfTestSessions: 0,
  testSessionDoneCount: 0,
  // In the Cloud we use ECS Tasks which combine the two image types, so we do both in the single Lambda invocation.
  // Locally we need to provision app slaves and selenium standalones separately.
  lambdaProvisioningFuncNames: {
    cloud: ['provisionAppSlaves'],
    local: ['provisionAppSlaves', 'provisionSeleniumStandalones']
  },
  // These environment variables are set in IaC ecs.tf and only used in cloud environment.
  // Doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html
  clientContext: {
    Custom: {
      customer: process.env.CUSTOMER,
      customerClusterArn: process.env.CUSTOMER_CLUSTER_ARN,
      serviceDiscoveryServices: Object.entries(process.env).filter(([key]) => key.startsWith('s2_app_slave_')).reduce((accumulator, [key, value]) => ({ ...accumulator, [key]: value }), {})
    }
  },
  isCloudEnv: process.env.NODE_ENV === 'cloud'
};

internals.serialiseClientContext = (clientContext) => Buffer.from(JSON.stringify(clientContext)).toString('base64');


internals.provisionContainers = ({ lambda, provisionViaLambdaDto, lambdaFunc }) => {
  const { log, clientContext, isCloudEnv, serialiseClientContext } = internals;
  const lambdaParams = {
    // https://github.com/awslabs/aws-sam-cli/pull/749
    InvocationType: 'RequestResponse',
    FunctionName: lambdaFunc,
    Payload: JSON.stringify({ provisionViaLambdaDto }),
    ClientContext: serialiseClientContext(clientContext)
  };

  isCloudEnv && log.debug(`The deserialised clientContext is: ${JSON.stringify(clientContext)}`, { tags: ['app.parallel', 'provisionContainers'] });

  const response = lambda.invoke(lambdaParams);
  const promise = response.promise();
  return { functionName: lambdaFunc, responseBodyProp: 'provisionViaLambdaDto', promise };
};


internals.resolvePromises = async (provisionFeedback) => {
  const { log } = internals;
  const promisesFromLambdas = provisionFeedback.map((p) => p.promise);

  const responses = await Promise.all(promisesFromLambdas).catch((err) => {
    // This gets hit if the Lambda timeout (not the S2_PROVISIONING_TIMEOUT) is too short, and maybe possibly with other faults.
    log.crit(`Unhandled error occurred from the Lambda service while attempting to start S2 app containers. Error was: ${err.message}.`, { tags: ['app.parallel'] });
    throw err; // Todo: As we learn more about the types of failures, we are going to have to provide non fatal workarounds: https://gitlab.com/purpleteam-labs/purpleteam/-/issues/22
  });
  log.debug(`The value of responses is: ${JSON.stringify(responses)}.`, { tags: ['app.parallel, resolvePromises'] });
  let provisionedViaLambdaDtoCollection;
  try {
    provisionedViaLambdaDtoCollection = responses.map((r) => {
      const payload = Bourne.parse(r.Payload);
      const provisionedViaLambdaDto = Object.prototype.hasOwnProperty.call(payload, 'body') ? payload.body.provisionedViaLambdaDto : undefined;
      return provisionedViaLambdaDto;
    });
  } catch (e) {
    log.crit(`Unhandled error occurred from Lambda service while attempting to start S2 app containers. Error was: ${e.message}.`, { tags: ['app.parallel'] });
    throw e;
  }

  const processNonFatal = (error) => { log.error(error); };
  const processFatal = (error) => { log.crit(error, { tags: ['app.parallel'] }); throw new Error(error); };

  provisionedViaLambdaDtoCollection.some((e) => {
    (!e || !e.items) && processFatal('Unexpected error in Lambda occurred. There were no items returned for one or more provisionedViaLambdaDto. Check the Lambda logs for details.'); // This can also be due to Lambda timeout.

    if (e.error) {
      const knownErrors = [
        { fatal: false, partial: 'Timeout exceeded', specific: `Handled error occurred within a Lambda function while attempting to start S2 app containers, Make sure you have the Docker images pulled locally. Error was: ${e.error}.` },
        { fatal: true, partial: 'Creation of service was not idempotent.', specific: 'Creation of service was not idempotent. The most common reason for this is that ECS services were not cleanly brought down from last test run.' }, // This wouldn't be fatal if we retried bringing services down and were successful.
        { fatal: false, partial: 'Unable to Start a service that is still Draining.', specific: 'Unable to Start a service that is still Draining. Try again soon.' },
        { fatal: true, partial: 'Unexpected error in Lambda occurred', specific: 'Unexpected error in Lambda occurred. Check the Lambda logs for details.' }
      ];

      knownErrors.some((kE) => {
        if (e.error.includes(kE.partial)) {
          kE.fatal && processFatal(kE.specific);
          processNonFatal(kE.specific);
          return true; // Short-circut knownErros on any match.
        }
        return false;
      });
    }
    return false; // Check for error in each of the provisionedViaLambdaDtos. Only short-circut on fatal.
  });

  log.debug(`The value of provisionedViaLambdaDtoCollection is: ${JSON.stringify(provisionedViaLambdaDtoCollection)}.`, { tags: ['app.parallel', 'resolvePromises'] });
  return provisionedViaLambdaDtoCollection;
};


internals.mergeProvisionedViaLambdaDtoCollection = (provisionedViaLambdaDtoCollection) => {
  const { log, isCloudEnv } = internals;
  const toMerge = [];
  const provisionedViaLambdaDtoItems = provisionedViaLambdaDtoCollection.map((provisionedViaLambdaDto) => provisionedViaLambdaDto.items);
  // local may look like this:
  // provisionedViaLambdaDtoItems = [
  //   [    // Result of provisionAppSlaves
  //     {testSessionId: 'lowPrivUser', ...},
  //     {testSessionId: 'adminUser', ...},
  //     {testSessionId: 'anotherExample', ...}
  //   ], [ // Result of provisionSeleniumStandalones
  //     {testSessionId: 'lowPrivUser', ...},
  //     {testSessionId: 'adminUser', ...},
  //     {testSessionId: 'anotherExample', ...}
  //   ]
  // ]
  const numberOfItems = provisionedViaLambdaDtoItems[0].length;
  log.debug(`The value of provisionedViaLambdaDtoItems is: ${JSON.stringify(provisionedViaLambdaDtoItems)}`, { tags: ['app.parallel', 'mergeProvisionedViaLambdaDtoCollection'] });
  // Todo: The following will require more testing, especially in local env.
  for (let i = 0; i < numberOfItems; i += 1) { // 3 items for example
    const itemCollector = [];
    provisionedViaLambdaDtoItems.forEach((items) => { // 2. provisionAppSlaves and provisionSeleniumStandalones ... if running in local env.
      itemCollector.push(items[i]);
    });
    toMerge.push(itemCollector);
  }
  // If running in local env:
  // toMerge = [
  //   [
  //     {testSessionId: 'lowPrivUser', ...},    // Result of provisionAppSlaves
  //     {testSessionId: 'lowPrivUser', ...}     // Result of provisionSeleniumStandalones
  //   ], [
  //     {testSessionId: 'adminUser', ...},      // Result of provisionAppSlaves
  //     {testSessionId: 'adminUser', ...}       // Result of provisionSeleniumStandalones
  //   ], [
  //     {testSessionId: 'anotherExample', ...}, // Result of provisionAppSlaves
  //     {testSessionId: 'anotherExample', ...}  // Result of provisionSeleniumStandalones
  //   ]
  // ]
  log.debug(`The value of toMerge is: ${JSON.stringify(toMerge)}`, { tags: ['app.parallel', 'mergeProvisionedViaLambdaDtoCollection'] });
  const mergedProvisionedViaLambdaDto = {};

  mergedProvisionedViaLambdaDto.items = toMerge.map((mCV) => {
    // If running in local env:
    // First iteration: mCV = [
    //   {testSessionId: 'lowPrivUser', ...},    // Result of provisionAppSlaves
    //   {testSessionId: 'lowPrivUser', ...}     // Result of provisionSeleniumStandalones
    // ]
    const { browser, testSessionId } = mCV[0];
    return {
      browser,
      testSessionId,
      appSlaveContainerName: mCV.find((e) => e.appSlaveContainerName).appSlaveContainerName,
      seleniumContainerName: mCV.find((e) => e.seleniumContainerName).seleniumContainerName,
      ...(isCloudEnv && { appEcsServiceName: mCV.find((e) => e.appEcsServiceName).appEcsServiceName }),
      ...(isCloudEnv && { seleniumEcsServiceName: mCV.find((e) => e.seleniumEcsServiceName).seleniumEcsServiceName }),
      ...(isCloudEnv && { appServiceDiscoveryServiceArn: mCV.find((e) => e.appServiceDiscoveryServiceArn).appServiceDiscoveryServiceArn }),
      ...(isCloudEnv && { seleniumServiceDiscoveryServiceArn: mCV.find((e) => e.seleniumServiceDiscoveryServiceArn).seleniumServiceDiscoveryServiceArn })
    };
  });
  // mergedProvisionedViaLambdaDto = {
  //   items: [
  //     {testSessionId: 'lowPrivUser', ...},
  //     {testSessionId: 'adminUser', ...},
  //     {testSessionId: 'anotherExample', ...}
  //   ]
  // }
  log.debug(`The value of mergedProvisionedViaLambdaDto is: ${JSON.stringify(mergedProvisionedViaLambdaDto)}`, { tags: ['app.parallel', 'mergeProvisionedViaLambdaDtoCollection'] });
  return mergedProvisionedViaLambdaDto;
};


internals.provisionViaLambda = async ({ cloudFuncOpts, provisionViaLambdaDto }) => {
  const {
    log,
    provisionContainers,
    resolvePromises,
    mergeProvisionedViaLambdaDtoCollection,
    lambdaProvisioningFuncNames: { [process.env.NODE_ENV]: lambdaFuncNames }
  } = internals;

  // Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#constructor-property
  const lambda = new Lambda(cloudFuncOpts);

  // local env calls two lambda functions which each start app slave zap or app slave selenium,
  // cloud env calls one lambda function which starts app slave zap and app slave selenium tasks.
  const collectionOfWrappedProvisionedViaLambdaDtos = lambdaFuncNames.map((f) => provisionContainers({ lambda, provisionViaLambdaDto, lambdaFunc: f }));

  const provisionedViaLambdaDtoCollection = await resolvePromises(collectionOfWrappedProvisionedViaLambdaDtos);
  // local may look like this,
  // where as cloud will only have the provisionAppSlaves result with each item containing both app slave and selenium values for each test session:
  // provisionedViaLambdaDtoCollection = [
  //   { // Result of provisionAppSlaves
  //     items: [
  //       {testSessionId: 'lowPrivUser', ...},
  //       {testSessionId: 'adminUser', ...},
  //       {testSessionId: 'anotherExample', ...}
  //     ]
  //   },{ // Result of provisionSeleniumStandalones
  //     items: [
  //       {testSessionId: 'lowPrivUser', ...},
  //       {testSessionId: 'adminUser', ...},
  //       {testSessionId: 'anotherExample', ...}
  //     ]
  //   }
  // ]
  log.debug(`The value of provisionedViaLambdaDtoCollection is: ${JSON.stringify(provisionedViaLambdaDtoCollection)}`, { tags: ['app.parallel', 'provisionViaLamda'] });
  return mergeProvisionedViaLambdaDtoCollection(provisionedViaLambdaDtoCollection);
};

// ////////////////////////////////////////////////////////////////
// Below here is after Lambda's have started stage two containers.
// ////////////////////////////////////////////////////////////////

internals.s2ContainersReady = async ({ collectionOfS2ContainerHostNamesWithPorts }) => {
  // Todo: port should be more specific, I.E. zap container port (container port): https://gitlab.com/purpleteam-labs/purpleteam/-/issues/26
  const { log, model: { slave: { protocol, port } } } = internals;
  log.notice('Checking whether S2 app containers are ready yet.', { tags: ['app.parallel'] });
  let containersAreReady = false;

  const containerReadyPromises = collectionOfS2ContainerHostNamesWithPorts.flatMap((mCV) => [
    // Doc explaining making requests to Zap. Usually they need to be proxied:
    //   https://github.com/zaproxy/zaproxy/issues/3796#issuecomment-319376915
    //   https://github.com/zaproxy/zaproxy/issues/3594
    {
      cloud() { return axios.get(`${protocol}://zap:${port}/UI`, { httpAgent: new HttpProxyAgent(`${protocol}://${mCV.appSlaveHostName}:${mCV.appSlavePort}`) }); },
      local() { return axios.get(`${protocol}://${mCV.appSlaveHostName}:${mCV.appSlavePort}/UI`); }
    }[process.env.NODE_ENV](),
    axios.get(`http://${mCV.seleniumHostName}:${mCV.seleniumPort}/wd/hub/status`)
  ]);

  const results = await Promise.all(containerReadyPromises)
    .catch((error) => {
      log.warning('Error occurred while testing that s2 app containers were up/responsive', { tags: ['app.parallel'] });
      if (error.response) {
        log.warning('The request was made and the server responded with a status code that falls out of the range of 2xx', { tags: ['app.parallel'] });
        log.warning(`${error.response.data}`, { tags: ['app.parallel'] });
        log.warning(`${error.response.status}`, { tags: ['app.parallel'] });
        log.warning(`${error.response.headers}`, { tags: ['app.parallel'] });
      } else if (error.request && error.message) {
        log.warning(`The request was made to check slave health but no response was received.\nThe error.message was: ${error.message}\nThe error.stack was: ${error.stack}`, { tags: ['app.parallel'] });
      } else {
        log.warning('Something happened in setting up the request that triggered an Error', { tags: ['app.parallel'] });
        log.warning(`${error.message}`, { tags: ['app.parallel'] });
      }
    });

  if (results) {
    const isReady = {
      appSlave: (response) => (typeof response.data === 'string') && response.data.includes('ZAP API UI'),
      seleniumContainer: (response) => response.data.value.ready === true
    };
    const containersThatAreNotReady = results.filter((e) => !(isReady.appSlave(e) || isReady.seleniumContainer(e)));
    log.debug(`containersThatAreNotReady is: ${JSON.stringify(containersThatAreNotReady)}`, { tags: ['app.parallel', 's2ContainersReady'] });
    containersAreReady = !containersThatAreNotReady.length;
  }
  return containersAreReady;
};


internals.getS2ContainerHostNamesWithPorts = ({ provisionedViaLambdaDto, cloudFuncOpts }) => new Promise((resolve, reject) => {
  const { model, log, isCloudEnv } = internals;
  let collectionOfS2ContainerHostNamesWithPorts = [];

  if (isCloudEnv) {
    // Todo: Abstract hard coded timeouts. There is also one in parallel function. https://gitlab.com/purpleteam-labs/purpleteam/-/issues/27
    const timeOut = 70000;
    let countDown = timeOut;
    const decrementInterval = 5000; // 1000 === one second.
    log.debug(`cloudFuncOpts for ServiceDiscovery is: ${JSON.stringify(cloudFuncOpts)}`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
    const serviceDiscovery = new ServiceDiscovery(cloudFuncOpts);
    const check = async () => {
      log.debug(`Inside check function with countDown value of: ${countDown}.`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
      countDown -= decrementInterval;
      if (await (async () => {
        log.debug(`Inside if statement with countDown value of ${countDown}.`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
        const collectionOfS2ServiceDiscoveryServiceInstances = await Promise.all(provisionedViaLambdaDto.items.map(async (mCV) => {
          const appServiceDiscoveryServiceId = mCV.appServiceDiscoveryServiceArn.split('/')[1];
          const seleniumServiceDiscoveryServiceId = mCV.seleniumServiceDiscoveryServiceArn.split('/')[1];
          log.debug(`app Service Discovery Service Id for testSessionId "${mCV.testSessionId}", with appEcsServiceName "${mCV.appEcsServiceName}" is "${appServiceDiscoveryServiceId}".`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
          log.debug(`selenium Service Discovery Service Id for testSessionId "${mCV.testSessionId}", with seleniumEcsServiceName "${mCV.seleniumEcsServiceName}" is "${seleniumServiceDiscoveryServiceId}".`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });

          // Lookup requests charge: $1.00 per million discovery API calls.
          const promiseOfS2AppServiceDiscoveryServiceInstances = serviceDiscovery.listInstances({ ServiceId: appServiceDiscoveryServiceId })
            .promise();
          const promiseOfS2SeleniumServiceDiscoveryServiceInstances = serviceDiscovery.listInstances({ ServiceId: seleniumServiceDiscoveryServiceId })
            .promise();
          let s2AppServiceDiscoveryServiceInstances;
          let s2SeleniumServiceDiscoveryServiceInstances;
          // Todo: Look at tidying up and optimising the below awaits.
          await Promise.resolve(promiseOfS2AppServiceDiscoveryServiceInstances).then((value) => {
            s2AppServiceDiscoveryServiceInstances = value;
            log.debug(`The resolved promiseOfS2AppServiceDiscoveryServiceInstances is: ${JSON.stringify(s2AppServiceDiscoveryServiceInstances)}`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
          });
          await Promise.resolve(promiseOfS2SeleniumServiceDiscoveryServiceInstances).then((value) => {
            s2SeleniumServiceDiscoveryServiceInstances = value;
            log.debug(`The resolved promiseOfS2SeleniumServiceDiscoveryServiceInstances is: ${JSON.stringify(s2SeleniumServiceDiscoveryServiceInstances)}`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
          });

          return { s2AppServiceDiscoveryServiceInstances, s2SeleniumServiceDiscoveryServiceInstances };
        }));

        log.debug(`Just mapped over provisionedViaLambdaDto.items. countDown value is: ${countDown}.`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
        log.debug(`The collectionOfS2ServiceDiscoveryServiceInstances is: ${JSON.stringify(collectionOfS2ServiceDiscoveryServiceInstances)}`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
        let allS2ServiceDiscoveryServiceInstancesNowAvailable = false;

        // Todo: We may need some sort of short circuit,
        // or at least handle scenario where we don't get all service instances (tasks) registered with service discovery
        // due to lack of AMI instance resources.
        allS2ServiceDiscoveryServiceInstancesNowAvailable = collectionOfS2ServiceDiscoveryServiceInstances.every((element) => {
          log.debug(`The value of element is: ${JSON.stringify(element)}`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
          log.debug(`The value of element.s2AppServiceDiscoveryServiceInstances.Instances.length is: ${element.s2AppServiceDiscoveryServiceInstances.Instances.length}`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
          log.debug(`The value of element.s2SeleniumServiceDiscoveryServiceInstances.Instances.length is: ${element.s2SeleniumServiceDiscoveryServiceInstances.Instances.length}`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
          return element.s2AppServiceDiscoveryServiceInstances.Instances.length > 0
            && element.s2SeleniumServiceDiscoveryServiceInstances.Instances.length > 0;
        });
        log.debug(`The value of allS2ServiceDiscoveryServiceInstancesNowAvailable is: ${allS2ServiceDiscoveryServiceInstancesNowAvailable}`, { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
        if (allS2ServiceDiscoveryServiceInstancesNowAvailable) {
          collectionOfS2ContainerHostNamesWithPorts = collectionOfS2ServiceDiscoveryServiceInstances.map((mCV) => ({
            appSlaveHostName: mCV.s2AppServiceDiscoveryServiceInstances.Instances[0].Attributes.AWS_INSTANCE_IPV4,
            appSlavePort: mCV.s2AppServiceDiscoveryServiceInstances.Instances[0].Attributes.AWS_INSTANCE_PORT,
            seleniumHostName: mCV.s2SeleniumServiceDiscoveryServiceInstances.Instances[0].Attributes.AWS_INSTANCE_IPV4,
            seleniumPort: mCV.s2SeleniumServiceDiscoveryServiceInstances.Instances[0].Attributes.AWS_INSTANCE_PORT
          }));
        }

        return allS2ServiceDiscoveryServiceInstancesNowAvailable;
      })()) {
        log.notice('All S2 Service Discovery Service Instance are now available.', { tags: ['app.parallel'] });
        resolve(collectionOfS2ContainerHostNamesWithPorts);
      } else if (countDown < 0) reject(new Error('Timed out while waiting for S2 Service Discovery Service Instances to be available.'));
      else setTimeout(check, decrementInterval);
    };
    log.debug('About to call setTimeout for the first time.', { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
    setTimeout(check, decrementInterval);
    log.debug('Called setTimeout for the first time.', { tags: ['app.parallel', 'getS2ContainerHostNamesWithPorts'] });
  } else {
    collectionOfS2ContainerHostNamesWithPorts = provisionedViaLambdaDto.items.map((mCV) => ({
      appSlaveHostName: mCV.appSlaveContainerName,
      appSlavePort: model.slave.port,
      seleniumHostName: mCV.seleniumContainerName,
      seleniumPort: '4444'
    }));
    resolve(collectionOfS2ContainerHostNamesWithPorts);
  }
});


internals.waitForS2ContainersReady = async ({
  provisionedViaLambdaDto,
  cloudFuncOpts,
  waitForS2ContainersTimeOut: timeOut
}) => {
  const { log, getS2ContainerHostNamesWithPorts, s2ContainersReady } = internals;
  log.debug('About to call getS2ContainerHostNamesWithPorts.', { tags: ['app.parallel', 'waitForS2ContainersReady'] });
  let collectionOfS2ContainerHostNamesWithPorts;
  await getS2ContainerHostNamesWithPorts({ provisionedViaLambdaDto, cloudFuncOpts }).then((resolved) => {
    collectionOfS2ContainerHostNamesWithPorts = resolved;
    log.debug(`The value of collectionOfS2ContainerHostNamesWithPorts is: ${JSON.stringify(collectionOfS2ContainerHostNamesWithPorts)}`, { tags: ['app.parallel', 'waitForS2ContainersReady'] });
  }).catch((error) => {
    // One of the reasons this happens is when services have been brought down and requested to be brought up again before draining.
    //   As per the error 'Unable to Start a service that is still Draining.' in resolvePromises sent back from the lambda.
    log.crit(`A failure occurred while attempting to get S2 Container Host Names with ports, The error message was: ${error.message}`, { tags: ['app.parallel'] });
    throw error;
  });

  const s2ContainersReadyOrNot = () => new Promise((resolve, reject) => {
    let countDown = timeOut;
    const decrementInterval = 2000;
    const check = async () => {
      countDown -= decrementInterval;
      if (await s2ContainersReady({ collectionOfS2ContainerHostNamesWithPorts })) resolve({ collectionOfS2ContainerHostNamesWithPorts, message: 'S2 app containers are ready to take orders.' });
      else if (countDown < 0) reject(new Error('Timed out while waiting for S2 app containers to be ready.'));
      else setTimeout(check, decrementInterval);
    };
    setTimeout(check, decrementInterval);
  });

  return s2ContainersReadyOrNot();
};


internals.deprovisionS2ContainersViaLambda = async (cloudFuncOpts, deprovisionViaLambdaDto) => {
  const {
    model,
    log,
    serialiseClientContext,
    clientContext: { Custom: { customer, customerClusterArn /* no need for serviceDiscoveryServices in deprovision, so leave out */ } }
  } = internals;
  const lambda = new Lambda(cloudFuncOpts);
  const lambdaParams = {
    // https://github.com/awslabs/aws-sam-cli/pull/749
    InvocationType: 'RequestResponse',
    FunctionName: 'deprovisionS2Containers',
    Payload: JSON.stringify({ deprovisionViaLambdaDto }),
    ClientContext: serialiseClientContext({ Custom: { customer, customerClusterArn } })
  };

  const response = lambda.invoke(lambdaParams);
  const promise = response.promise();
  const resolved = await promise;

  let item;
  let error;
  let unhandledErrorMessageFromWithinLambda;
  try {
    const payload = Bourne.parse(resolved.Payload);
    const deprovisionedViaLambdaDto = Object.prototype.hasOwnProperty.call(payload, 'body') ? payload.body.deprovisionedViaLambdaDto : undefined;
    unhandledErrorMessageFromWithinLambda = Object.prototype.hasOwnProperty.call(payload, 'errorMessage') && payload.errorMessage;
    ({ item, error } = deprovisionedViaLambdaDto || { item: undefined, error: undefined });
  } catch (e) {
    log.crit(`Unhandled error occurred from Lambda service while attempting to stop S2 app containers with function "${lambdaParams.FunctionName}". Error was: ${e.message}`, { tags: ['app.parallel'] });
    throw e; // Todo: As we learn more about the types of failures, we are going to have to provide non fatal workarounds.
  }
  // purpleteam-labs need to know about this,
  // but the call to bring the containers down will still more than likely be successful, so no point in notifying the Build User.
  // Possibly set-up a cloudwatch alarm or similar... https://gitlab.com/purpleteam-labs/purpleteam-iac/-/issues/11
  !!error && log.error(`Handled error occurred within Lambda function "${lambdaParams.FunctionName}" while attempting to stop S2 app containers. Error was: ${error}`, { tags: ['app.parallel'] });
  !!item && log.notice(item, { tags: ['app.parallel'] });
  if (unhandledErrorMessageFromWithinLambda) {
    const errorMessage = `Unhandled error occurred within Lambda function "${lambdaParams.FunctionName}" while attempting to stop S2 app containers. Error was: ${unhandledErrorMessageFromWithinLambda}`;
    log.crit(errorMessage);
    throw new Error(errorMessage);
  }
  model.status('awaiting job');
};

internals.runTestSession = (cloudFuncOpts, runableSessionProps, deprovisionViaLambdaDto) => {
  const { model, log, numberOfTestSessions, debug: { execArgvDebugString } } = internals;
  const cucumberArgs = model.createCucumberArgs(runableSessionProps);

  const cucCli = spawn('node', [...(execArgvDebugString ? [`${execArgvDebugString}:${internals.nextChildProcessInspectPort}`] : []), ...cucumberArgs], { cwd: process.cwd(), env: process.env, argv0: process.argv[0] });
  internals.nextChildProcessInspectPort += 1;
  log.notice(`cucCli process with PID "${cucCli.pid}" has been spawned for test session with Id "${runableSessionProps.sessionProps.testSession.id}"`, { tags: ['app.parallel'] });
  model.status('app tests are running');

  cucCli.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  cucCli.stderr.on('data', (data) => {
    process.stdout.write(data);
  });

  cucCli.on('exit', async (code, signal) => {
    const message = `child process "cucumber Cli" running session with id: "${runableSessionProps.sessionProps.testSession.id}" exited with code: "${code}", and signal: "${signal}".`;
    log.notice(message, { tags: ['app.parallel'] });
    internals.testSessionDoneCount += 1;
    if (model.slave.shutdownSlavesAfterTest && internals.testSessionDoneCount >= numberOfTestSessions) {
      internals.testSessionDoneCount = 0;
      internals.deprovisionS2ContainersViaLambda(cloudFuncOpts, deprovisionViaLambdaDto);
    }
  });

  cucCli.on('close', (code) => {
    const message = `"close" event was emitted with code: "${code}" for "cucumber Cli" running session with id "${runableSessionProps.sessionProps.testSession.id}".`;
    log.notice(message, { tags: ['app.parallel'] });
  });

  cucCli.on('error', (err) => {
    process.stdout.write(`Failed to start sub-process. The error was: ${err}.`, { tags: ['app.parallel'] });
    model.status('awaiting job');
  });
};

// ////////////////////////////////////////////////////////////////
// parallel is the exported function that drives this model.
// ////////////////////////////////////////////////////////////////

const parallel = async ({ model, model: { log, debug, cloud: { function: { region, lambdaEndpoint, serviceDiscoveryEndpoint } } }, sessionsProps }) => {
  const { waitForS2ContainersReady, runTestSession } = internals;
  internals.log = log;
  internals.model = model;
  internals.debug = debug;
  internals.nextChildProcessInspectPort = debug.firstChildProcessInspectPort;
  internals.numberOfTestSessions = sessionsProps.length;

  const provisionViaLambdaDto = {
    items: sessionsProps.map((s) => ({
      testSessionId: s.testSession.id,
      browser: s.browser,
      appSlaveContainerName: null,
      seleniumContainerName: null,
      appEcsServiceName: null, // Populated in the cloud lambda function, so we can destroy the ECS services after testing.
      seleniumEcsServiceName: null // Populated in the cloud lambda function, so we can destroy the ECS services after testing.
    }))
  };

  const provisionedViaLambdaDto = await internals.provisionViaLambda({ cloudFuncOpts: { region, endpoint: lambdaEndpoint }, provisionViaLambdaDto });
  log.debug(`The value of provisionedViaLambdaDto is: ${JSON.stringify(provisionedViaLambdaDto)}`, { tags: ['app.parallel', 'parallel'] });

  const deprovisionViaLambdaDto = {
    local: { items: ['app-slave', 'selenium-standalone'] },
    cloud: { items: provisionedViaLambdaDto.items.flatMap((cV) => [cV.appEcsServiceName, cV.seleniumEcsServiceName]) }
  }[process.env.NODE_ENV];
  log.debug(`The value of deprovisionViaLambdaDto is: ${JSON.stringify(deprovisionViaLambdaDto)}`, { tags: ['app.parallel', 'parallel'] });
  let returnStatus;
  let cloudFuncOpts;
  await waitForS2ContainersReady({
    provisionedViaLambdaDto,
    waitForS2ContainersTimeOut: 30000 /* 10000 */,
    cloudFuncOpts: { cloud: { region, endpoint: serviceDiscoveryEndpoint }, local: null }[process.env.NODE_ENV]
  }).then((resolved) => {
    log.notice(resolved.message, { tags: ['app.parallel'] });

    const runableSessionsProps = resolved.collectionOfS2ContainerHostNamesWithPorts.map((cV, i) => ({
      sessionProps: sessionsProps[i],
      slaveHost: cV.appSlaveHostName,
      seleniumContainerName: cV.seleniumHostName,
      appSlavePort: cV.appSlavePort,
      seleniumPort: cV.seleniumPort
    }));
    // Todo: obfuscate sensitive values from runableSessionProps.
    log.debug(`The value of runableSessionsProps is: ${JSON.stringify(runableSessionsProps)}`, { tags: ['app.parallel', 'parallel'] });

    cloudFuncOpts = { region, endpoint: lambdaEndpoint };
    runableSessionsProps.forEach((rSP) => {
      runTestSession(cloudFuncOpts, rSP, deprovisionViaLambdaDto);
    });
    returnStatus = model.status('app tests are running');
  }).catch((error) => {
    log.error(error.message, { tags: ['app.parallel'] });
    log.notice('Attempting to bring S2 containers down.', { tags: ['app.parallel'] });
    internals.deprovisionS2ContainersViaLambda(cloudFuncOpts, deprovisionViaLambdaDto);
    returnStatus = 'Back-end failure: S2 app containers were not ready.';
  });

  return returnStatus;
};

module.exports = parallel;
