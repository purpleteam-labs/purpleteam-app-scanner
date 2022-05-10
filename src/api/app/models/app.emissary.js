// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

// Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-lambda/index.html
// Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-lambda/classes/invokecommand.html
// Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-servicediscovery/index.html
// Doc: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-servicediscovery/classes/listinstancescommand.html
// Doc: https://docs.aws.amazon.com/code-samples/latest/catalog/javascriptv3-lambda-src-MyLambdaApp-index.ts.html
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { ServiceDiscoveryClient, ListInstancesCommand } from '@aws-sdk/client-servicediscovery';
import got from 'got';
import HttpProxyAgent from 'http-proxy-agent';
import Bourne from '@hapi/bourne';

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
  emissary: undefined,
  s2Containers: undefined,
  // In the Cloud we use ECS Tasks which combine the two image types, so we do both in the single Lambda invocation.
  // Locally we need to provision app emissaries and selenium standalones separately.
  lambdaProvisioningFuncNames: {
    cloud: ['provisionAppEmissaries'],
    local: ['provisionAppEmissaries', 'provisionSeleniumStandalones']
  },
  // These environment variables are set in IaC ecs.tf and only used in cloud environment.
  // Doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html
  clientContext: {
    Custom: {
      customer: process.env.CUSTOMER,
      customerClusterArn: process.env.CUSTOMER_CLUSTER_ARN,
      serviceDiscoveryServices: Object.entries(process.env).filter(([key]) => key.startsWith('s2_app_emissary_')).reduce((accumulator, [key, value]) => ({ ...accumulator, [key]: value }), {})
    }
  },
  isCloudEnv: process.env.NODE_ENV === 'cloud',
  serialiseClientContext: (clientContext) => Buffer.from(JSON.stringify(clientContext)).toString('base64')
};

internals.provisionContainers = async ({ lambdaClient, provisionViaLambdaDto, lambdaFunc }) => {
  const { log, clientContext, isCloudEnv, serialiseClientContext } = internals;
  const lambdaParams = {
    // https://github.com/awslabs/aws-sam-cli/pull/749
    InvocationType: 'RequestResponse',
    FunctionName: lambdaFunc,
    Payload: JSON.stringify({ provisionViaLambdaDto }),
    ClientContext: serialiseClientContext(clientContext)
  };
  const command = new InvokeCommand(lambdaParams);

  isCloudEnv && log.debug(`The deserialised clientContext is: ${JSON.stringify(clientContext)}`, { tags: ['app.emissary', 'provisionContainers'] });

  const data = await lambdaClient.send(command);
  return { functionName: lambdaFunc, responseBodyProp: 'provisionViaLambdaDto', data };
};

internals.resolvePromises = async (promisesFromLambdas) => {
  const { log } = internals;
  const provisionContainersResult = await Promise.all(promisesFromLambdas).catch((err) => {
    // This gets hit if the Lambda timeout (not the S2_PROVISIONING_TIMEOUT) is too short, and maybe possibly with other faults.
    log.crit(`Unhandled error occurred from the Lambda service while attempting to start S2 app containers. Error was: ${err.message}.`, { tags: ['app.emissary'] });
    throw err; // Todo: As we learn more about the types of failures, we are going to have to provide non fatal workarounds: https://gitlab.com/purpleteam-labs/purpleteam/-/issues/22
  });
  let provisionedViaLambdaDtoCollection;
  try {
    provisionedViaLambdaDtoCollection = provisionContainersResult.map((r) => {
      const payload = Bourne.parse(new TextDecoder('utf-8').decode(r.data.Payload));
      const provisionedViaLambdaDto = Object.prototype.hasOwnProperty.call(payload, 'body') ? payload.body.provisionedViaLambdaDto : undefined;
      return provisionedViaLambdaDto;
    });
  } catch (e) {
    log.crit(`Unhandled error occurred from Lambda service while attempting to start S2 app containers. Error was: ${e.message}.`, { tags: ['app.emissary'] });
    throw e;
  }

  const processNonFatal = (error) => { log.error(error); };
  const processFatal = (error) => { log.crit(error, { tags: ['app.emissary'] }); throw new Error(error); };

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

  return provisionedViaLambdaDtoCollection;
};

internals.mergeProvisionedViaLambdaDtoCollection = (provisionedViaLambdaDtoCollection) => {
  const { log, isCloudEnv } = internals;
  const toMerge = [];
  const provisionedViaLambdaDtoItems = provisionedViaLambdaDtoCollection.map((provisionedViaLambdaDto) => provisionedViaLambdaDto.items);
  // local may look like this:
  // provisionedViaLambdaDtoItems = [
  //   [    // Result of provisionAppEmissaries
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
  log.debug(`The value of provisionedViaLambdaDtoItems is: ${JSON.stringify(provisionedViaLambdaDtoItems, null, 2)}`, { tags: ['app.emissary', 'mergeProvisionedViaLambdaDtoCollection'] });
  // Todo: The following will require more testing, especially in local env.
  for (let i = 0; i < numberOfItems; i += 1) { // 3 items for example
    const itemCollector = [];
    provisionedViaLambdaDtoItems.forEach((items) => { // 2. provisionAppEmissaries and provisionSeleniumStandalones ... if running in local env.
      itemCollector.push(items[i]);
    });
    toMerge.push(itemCollector);
  }
  // If running in local env:
  // toMerge = [
  //   [
  //     {testSessionId: 'lowPrivUser', ...},    // Result of provisionAppEmissaries
  //     {testSessionId: 'lowPrivUser', ...}     // Result of provisionSeleniumStandalones
  //   ], [
  //     {testSessionId: 'adminUser', ...},      // Result of provisionAppEmissaries
  //     {testSessionId: 'adminUser', ...}       // Result of provisionSeleniumStandalones
  //   ], [
  //     {testSessionId: 'anotherExample', ...}, // Result of provisionAppEmissaries
  //     {testSessionId: 'anotherExample', ...}  // Result of provisionSeleniumStandalones
  //   ]
  // ]
  log.debug(`The value of toMerge is: ${JSON.stringify(toMerge, null, 2)}`, { tags: ['app.emissary', 'mergeProvisionedViaLambdaDtoCollection'] });
  const mergedProvisionedViaLambdaDto = {};

  mergedProvisionedViaLambdaDto.items = toMerge.map((mCV) => {
    // If running in local env:
    // First iteration: mCV = [
    //   {testSessionId: 'lowPrivUser', ...},    // Result of provisionAppEmissaries
    //   {testSessionId: 'lowPrivUser', ...}     // Result of provisionSeleniumStandalones
    // ]
    const { browser, testSessionId } = mCV[0];
    return {
      browser,
      testSessionId,
      appEmissaryContainerName: mCV.find((e) => e.appEmissaryContainerName).appEmissaryContainerName,
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
  log.debug(`The value of mergedProvisionedViaLambdaDto is: ${JSON.stringify(mergedProvisionedViaLambdaDto, null, 2)}`, { tags: ['app.emissary', 'mergeProvisionedViaLambdaDtoCollection'] });
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
  const lambdaClient = new LambdaClient(cloudFuncOpts);

  // local env calls two lambda functions which each start app emissary zap or app emissary selenium,
  // cloud env calls one lambda function which starts app emissary zap and app emissary selenium tasks.
  const collectionOfWrappedProvisionedViaLambdaDtos = lambdaFuncNames.map((f) => provisionContainers({ lambdaClient, provisionViaLambdaDto, lambdaFunc: f }));

  const provisionedViaLambdaDtoCollection = await resolvePromises(collectionOfWrappedProvisionedViaLambdaDtos);
  // local may look like this,
  // where as cloud will only have the provisionAppEmissaries result with each item containing both app emissary and selenium values for each Test Session:
  // provisionedViaLambdaDtoCollection = [
  //   { // Result of provisionAppEmissaries
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
  log.debug(`The value of provisionedViaLambdaDtoCollection is: ${JSON.stringify(provisionedViaLambdaDtoCollection, null, 2)}`, { tags: ['app.emissary', 'provisionViaLamda'] });
  return mergeProvisionedViaLambdaDtoCollection(provisionedViaLambdaDtoCollection);
};

// ////////////////////////////////////////////////////////////////
// Below here is after Lambda's have started stage two containers.
// ////////////////////////////////////////////////////////////////

internals.s2ContainersReady = async ({ collectionOfS2ContainerHostNamesWithPorts }) => {
  const { log, emissary: { protocol, port } } = internals;
  log.info('Checking whether S2 app containers are ready yet.', { tags: ['app.emissary'] });
  let containersAreReady = false;

  const containerReadyPromises = collectionOfS2ContainerHostNamesWithPorts.flatMap((mCV) => [
    // Doc explaining making requests to Zap. Usually they need to be proxied:
    //   https://github.com/zaproxy/zaproxy/issues/3796#issuecomment-319376915
    //   https://github.com/zaproxy/zaproxy/issues/3594
    {
      cloud() { return got.get(`${protocol}://zap:${port}/UI`, { httpAgent: new HttpProxyAgent(`${protocol}://${mCV.appEmissaryHostName}:${mCV.appEmissaryPort}`) }); },
      local() { return got.get(`${protocol}://${mCV.appEmissaryHostName}:${mCV.appEmissaryPort}/UI`); }
    }[process.env.NODE_ENV](),
    got.get(`http://${mCV.seleniumHostName}:${mCV.seleniumPort}/wd/hub/status`)
  ]);

  const results = await Promise.all(containerReadyPromises)
    .catch((error) => {
      log.warning('Error occurred while testing that s2 app containers were up/responsive', { tags: ['app.emissary'] });
      if (error.response) {
        log.warning('The request was made and the server responded with a status code that falls out of the range of 2xx', { tags: ['app.emissary'] });
        log.warning(`${error.response.data}`, { tags: ['app.emissary'] });
        log.warning(`${error.response.status}`, { tags: ['app.emissary'] });
        log.warning(`${error.response.headers}`, { tags: ['app.emissary'] });
      } else if (error.request && error.message) {
        log.warning(`The request was made to check emissary health but no response was received.\nThe error.message was: ${error.message}\nThe error.stack was: ${error.stack}`, { tags: ['app.emissary'] });
      } else {
        log.warning('Something happened in setting up the request that triggered an Error', { tags: ['app.emissary'] });
        log.warning(`${error.message}`, { tags: ['app.emissary'] });
      }
    });

  if (results) {
    const isReady = {
      appEmissary: (response) => (typeof response.data === 'string') && response.data.includes('ZAP API UI'),
      seleniumContainer: (response) => response.data.value.ready === true
    };
    const containersThatAreNotReady = results.filter((e) => !(isReady.appEmissary(e) || isReady.seleniumContainer(e)));
    log.notice(`containersThatAreNotReady is: ${JSON.stringify(containersThatAreNotReady)}`, { tags: ['app.emissary', 's2ContainersReady'] });
    containersAreReady = !containersThatAreNotReady.length;
  }
  return containersAreReady;
};

internals.getS2ContainerHostNamesWithPorts = ({ provisionedViaLambdaDto, cloudFuncOpts }) => new Promise((resolve, reject) => {
  const { log, isCloudEnv, s2Containers: { serviceDiscoveryServiceInstances: { timeoutToBeAvailable, retryIntervalToBeAvailable } }, emissary: { port } } = internals;
  let collectionOfS2ContainerHostNamesWithPorts = [];

  if (isCloudEnv) {
    let countDown = timeoutToBeAvailable;
    const decrementInterval = retryIntervalToBeAvailable;
    log.debug(`cloudFuncOpts for ServiceDiscovery is: ${JSON.stringify(cloudFuncOpts)}`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
    const serviceDiscoveryClient = new ServiceDiscoveryClient(cloudFuncOpts);
    const check = async () => {
      log.debug(`Inside check function with countDown value of: ${countDown}.`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
      countDown -= decrementInterval;
      if (await (async () => {
        log.debug(`Inside if statement with countDown value of ${countDown}.`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
        const collectionOfS2ServiceDiscoveryServiceInstances = await Promise.all(provisionedViaLambdaDto.items.map(async (mCV) => {
          const appServiceDiscoveryServiceId = mCV.appServiceDiscoveryServiceArn.split('/')[1];
          const seleniumServiceDiscoveryServiceId = mCV.seleniumServiceDiscoveryServiceArn.split('/')[1];
          log.debug(`app Service Discovery Service Id for testSessionId "${mCV.testSessionId}", with appEcsServiceName "${mCV.appEcsServiceName}" is "${appServiceDiscoveryServiceId}".`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
          log.debug(`selenium Service Discovery Service Id for testSessionId "${mCV.testSessionId}", with seleniumEcsServiceName "${mCV.seleniumEcsServiceName}" is "${seleniumServiceDiscoveryServiceId}".`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });

          // Lookup requests charge: $1.00 per million discovery API calls.
          const listAppInstancesCommand = new ListInstancesCommand({ ServiceId: appServiceDiscoveryServiceId });
          const s2AppServiceDiscoveryServiceInstances = await serviceDiscoveryClient.send(listAppInstancesCommand);
          log.debug(`The s2AppServiceDiscoveryServiceInstances are: ${JSON.stringify(s2AppServiceDiscoveryServiceInstances)}`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
          const listSeleniumInstancesCommand = new ListInstancesCommand({ ServiceId: seleniumServiceDiscoveryServiceId });
          const s2SeleniumServiceDiscoveryServiceInstances = await serviceDiscoveryClient.send(listSeleniumInstancesCommand);
          log.debug(`The s2SeleniumServiceDiscoveryServiceInstances are: ${JSON.stringify(s2SeleniumServiceDiscoveryServiceInstances)}`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
          return { s2AppServiceDiscoveryServiceInstances, s2SeleniumServiceDiscoveryServiceInstances };
        }));

        log.debug(`Just mapped over provisionedViaLambdaDto.items. countDown value is: ${countDown}.`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
        log.debug(`The collectionOfS2ServiceDiscoveryServiceInstances is: ${JSON.stringify(collectionOfS2ServiceDiscoveryServiceInstances)}`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
        let allS2ServiceDiscoveryServiceInstancesNowAvailable = false;

        // Todo: We may need some sort of short circuit,
        // or at least handle scenario where we don't get all service instances (tasks) registered with service discovery
        // due to lack of AMI instance resources.
        allS2ServiceDiscoveryServiceInstancesNowAvailable = collectionOfS2ServiceDiscoveryServiceInstances.every((element) => {
          log.debug(`The value of element is: ${JSON.stringify(element)}`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
          log.debug(`The value of element.s2AppServiceDiscoveryServiceInstances.Instances.length is: ${element.s2AppServiceDiscoveryServiceInstances.Instances.length}`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
          log.debug(`The value of element.s2SeleniumServiceDiscoveryServiceInstances.Instances.length is: ${element.s2SeleniumServiceDiscoveryServiceInstances.Instances.length}`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
          return element.s2AppServiceDiscoveryServiceInstances.Instances.length > 0
            && element.s2SeleniumServiceDiscoveryServiceInstances.Instances.length > 0;
        });
        log.debug(`The value of allS2ServiceDiscoveryServiceInstancesNowAvailable is: ${allS2ServiceDiscoveryServiceInstancesNowAvailable}`, { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
        if (allS2ServiceDiscoveryServiceInstancesNowAvailable) {
          collectionOfS2ContainerHostNamesWithPorts = collectionOfS2ServiceDiscoveryServiceInstances.map((mCV) => ({
            appEmissaryHostName: mCV.s2AppServiceDiscoveryServiceInstances.Instances[0].Attributes.AWS_INSTANCE_IPV4,
            appEmissaryPort: mCV.s2AppServiceDiscoveryServiceInstances.Instances[0].Attributes.AWS_INSTANCE_PORT,
            seleniumHostName: mCV.s2SeleniumServiceDiscoveryServiceInstances.Instances[0].Attributes.AWS_INSTANCE_IPV4,
            seleniumPort: mCV.s2SeleniumServiceDiscoveryServiceInstances.Instances[0].Attributes.AWS_INSTANCE_PORT
          }));
        }

        return allS2ServiceDiscoveryServiceInstancesNowAvailable;
      })()) {
        log.info('All S2 Service Discovery Service Instance are now available.', { tags: ['app.emissary'] });
        resolve(collectionOfS2ContainerHostNamesWithPorts);
      } else if (countDown < 0) reject(new Error('Timed out while waiting for S2 Service Discovery Service Instances to be available.'));
      else setTimeout(check, decrementInterval);
    };
    log.debug('About to call setTimeout for the first time.', { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
    setTimeout(check, decrementInterval);
    log.debug('Called setTimeout for the first time.', { tags: ['app.emissary', 'getS2ContainerHostNamesWithPorts'] });
  } else {
    collectionOfS2ContainerHostNamesWithPorts = provisionedViaLambdaDto.items.map((mCV) => ({
      appEmissaryHostName: mCV.appEmissaryContainerName,
      appEmissaryPort: port,
      seleniumHostName: mCV.seleniumContainerName,
      seleniumPort: '4444'
    }));
    resolve(collectionOfS2ContainerHostNamesWithPorts);
  }
});

internals.waitForS2ContainersReady = async ({
  provisionedViaLambdaDto,
  cloudFuncOpts,
  waitForS2ContainersTimeOut: timeout
}) => {
  const { log, getS2ContainerHostNamesWithPorts, s2ContainersReady, s2Containers: { responsive: { retryInterval } } } = internals;
  log.debug('About to call getS2ContainerHostNamesWithPorts.', { tags: ['app.emissary', 'waitForS2ContainersReady'] });
  let collectionOfS2ContainerHostNamesWithPorts;
  await getS2ContainerHostNamesWithPorts({ provisionedViaLambdaDto, cloudFuncOpts }).then((resolved) => {
    collectionOfS2ContainerHostNamesWithPorts = resolved;
    log.debug(`The value of collectionOfS2ContainerHostNamesWithPorts is: ${JSON.stringify(collectionOfS2ContainerHostNamesWithPorts, null, 2)}`, { tags: ['app.emissary', 'waitForS2ContainersReady'] });
  }).catch((error) => {
    // One of the reasons this happens is when services have been brought down and requested to be brought up again before draining.
    //   As per the error 'Unable to Start a service that is still Draining.' in resolvePromises sent back from the lambda.
    log.crit(`A failure occurred while attempting to get S2 Container Host Names with ports, The error message was: ${error.message}`, { tags: ['app.emissary'] });
    throw error;
  });

  const s2ContainersReadyOrNot = () => new Promise((resolve, reject) => {
    let countDown = timeout;
    const check = async () => {
      countDown -= retryInterval;
      if (await s2ContainersReady({ collectionOfS2ContainerHostNamesWithPorts })) resolve({ collectionOfS2ContainerHostNamesWithPorts, message: 'S2 app containers are ready to take orders.' });
      else if (countDown < 0) reject(new Error('Timed out while waiting for S2 app containers to be ready.'));
      else setTimeout(check, retryInterval);
    };
    setTimeout(check, retryInterval);
  });
  return s2ContainersReadyOrNot();
};

const deprovisionS2ContainersViaLambda = async ({ cloudFuncOpts, deprovisionViaLambdaDto }) => {
  const {
    log,
    serialiseClientContext,
    clientContext: { Custom: { customer, customerClusterArn /* no need for serviceDiscoveryServices in deprovision, so leave out */ } }
  } = internals;
  const lambdaClient = new LambdaClient(cloudFuncOpts);
  const lambdaParams = {
    // https://github.com/awslabs/aws-sam-cli/pull/749
    InvocationType: 'RequestResponse',
    FunctionName: 'deprovisionS2Containers',
    Payload: JSON.stringify({ deprovisionViaLambdaDto }),
    ClientContext: serialiseClientContext({ Custom: { customer, customerClusterArn } })
  };
  const command = new InvokeCommand(lambdaParams);
  const response = await lambdaClient.send(command);
  let item;
  let error;
  let unhandledErrorMessageFromWithinLambda;
  try {
    const payload = Bourne.parse(new TextDecoder('utf-8').decode(response.Payload));
    const deprovisionedViaLambdaDto = Object.prototype.hasOwnProperty.call(payload, 'body') ? payload.body.deprovisionedViaLambdaDto : undefined;
    unhandledErrorMessageFromWithinLambda = Object.prototype.hasOwnProperty.call(payload, 'errorMessage') && payload.errorMessage;
    ({ item, error } = deprovisionedViaLambdaDto || { item: undefined, error: undefined });
  } catch (e) {
    log.crit(`Unhandled error occurred from Lambda service while attempting to stop S2 app containers with function "${lambdaParams.FunctionName}". Error was: ${e.message}`, { tags: ['app.emissary'] });
    throw e; // Todo: As we learn more about the types of failures, we are going to have to provide non fatal workarounds.
  }
  // PurpleTeam-Labs need to know about this,
  // but the call to bring the containers down will still more than likely be successful, so no point in notifying the Build User.
  // Possibly set-up a cloudwatch alarm or similar... https://gitlab.com/purpleteam-labs/purpleteam-iac/-/issues/11
  !!error && log.error(`Handled error occurred within Lambda function "${lambdaParams.FunctionName}" while attempting to stop S2 app containers. Error was: ${error}`, { tags: ['app.emissary'] });
  !!item && log.notice(item, { tags: ['app.emissary'] });
  if (unhandledErrorMessageFromWithinLambda) {
    const errorMessage = `Unhandled error occurred within Lambda function "${lambdaParams.FunctionName}" while attempting to stop S2 app containers. Error was: ${unhandledErrorMessageFromWithinLambda}`;
    log.crit(errorMessage);
    throw new Error(errorMessage);
  }
};

const initEmissaries = async ({ sessionsProps, app: { log, status, s2Containers, emissary, cloud: { function: { region, lambdaEndpoint, serviceDiscoveryEndpoint } } }, appInstance }) => {
  const { waitForS2ContainersReady } = internals;
  internals.log = log;
  internals.s2Containers = s2Containers;
  internals.emissary = emissary;

  const provisionViaLambdaDto = {
    items: sessionsProps.map((s) => ({
      testSessionId: s.testSession.id,
      browser: s.browser,
      appEmissaryContainerName: null,
      seleniumContainerName: null,
      appEcsServiceName: null, // Populated in the cloud lambda function, so we can destroy the ECS services after testing.
      seleniumEcsServiceName: null // Populated in the cloud lambda function, so we can destroy the ECS services after testing.
    }))
  };

  const provisionedViaLambdaDto = await internals.provisionViaLambda({ cloudFuncOpts: { region, endpoint: lambdaEndpoint }, provisionViaLambdaDto });
  log.debug(`The value of provisionedViaLambdaDto is: ${JSON.stringify(provisionedViaLambdaDto, null, 2)}`, { tags: ['app.emissary', 'initEmissaries'] });

  const deprovisionViaLambdaDto = {
    local: { items: ['app-emissary', 'selenium-standalone'] },
    cloud: { items: provisionedViaLambdaDto.items.flatMap((cV) => [cV.appEcsServiceName, cV.seleniumEcsServiceName]) }
  }[process.env.NODE_ENV];
  log.debug(`The value of deprovisionViaLambdaDto is: ${JSON.stringify(deprovisionViaLambdaDto, null, 2)}`, { tags: ['app.emissary', 'initEmissaries'] });
  const returnResult = { status: null, testingProps: null };
  await waitForS2ContainersReady({
    provisionedViaLambdaDto,
    waitForS2ContainersTimeOut: s2Containers.responsive.timeout,
    cloudFuncOpts: { cloud: { region, endpoint: serviceDiscoveryEndpoint }, local: null }[process.env.NODE_ENV]
  }).then((resolved) => {
    log.info(resolved.message, { tags: ['app.emissary'] });

    const runableSessionsProps = resolved.collectionOfS2ContainerHostNamesWithPorts.map((cV, i) => ({
      sessionProps: sessionsProps[i],
      emissaryHost: cV.appEmissaryHostName,
      seleniumContainerName: cV.seleniumHostName,
      appEmissaryPort: cV.appEmissaryPort,
      seleniumPort: cV.seleniumPort
    }));
    // Todo: obfuscate sensitive values from runableSessionProps.
    log.debug(`The value of runableSessionsProps is: ${JSON.stringify(runableSessionsProps, null, 2)}`, { tags: ['app.emissary', 'initEmissaries'] });

    returnResult.testingProps = { runableSessionsProps, deprovisionViaLambdaDto, cloudFuncOpts: { region, endpoint: lambdaEndpoint } };
    returnResult.status = status.call(appInstance, 'Tester initialised.');
  }).catch((error) => {
    log.error(error.message, { tags: ['app.emissary'] });
    log.info('Attempting to bring S2 containers down.', { tags: ['app.emissary'] });
    returnResult.testingProps = { deprovisionViaLambdaDto, cloudFuncOpts: { region, endpoint: lambdaEndpoint } };
    returnResult.status = 'Tester failure: S2 app containers were not ready.';
  });

  return returnResult;
};

export default {
  deprovisionS2ContainersViaLambda,
  initEmissaries
};
