// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import test from 'ava';
// import sinon from 'sinon';
import App from '../../../../src/api/app/models/app.js';

// ////////////////////////////////////////////////
// getActiveFeatureFileUris
// ////////////////////////////////////////////////

const getAnAppInstance = () => {
  const cucumberConfig = { features: 'src/features', steps: 'src/steps' };
  const appOptions = { log: undefined, strings: undefined, emissary: undefined, cucumber: cucumberConfig, results: undefined, cloud: undefined, debug: undefined, s2Containers: undefined }; // eslint-disable-line max-len
  return new App(appOptions);
};

test('Given tagExpression: (@app_scan) - when testPlan is invoked - then the app_scan.feature text should be returned', async (t) => {
  const testJob = { data: { type: 'BrowserApp' } };
  const expectedTestPlan = `@app_scan
Feature: Web application free of security vulnerabilities known to the Emissary

# Before hooks are run before Background

Background:
  Given a new Test Session based on each Build User supplied appScanner resourceObject
  And the Emissary sites tree is populated with each Build User supplied route of each appScanner resourceObject
  And the Emissary authentication is configured for the SUT
  And the application is spidered for each appScanner resourceObject

Scenario: The application should not contain vulnerabilities known to the Emissary that exceed the Build User defined threshold
  Given the active scanners are configured
  When the active scan is run
  Then the vulnerability count should not exceed the Build User defined threshold of vulnerabilities known to the Emissary

`;
  const testPlan = await getAnAppInstance().testPlan(testJob);
  t.is(testPlan, expectedTestPlan);
});

test('Given tagExpression: (@api_scan) - when testPlan is invoked - then the api_scan.feature text should be returned', async (t) => {
  const testJob = { data: { type: 'Api' } };
  const expectedTestPlan = `@api_scan
Feature: Web API free of security vulnerabilities known to the Emissary

# Before hooks are run before Background

Background:
  Given a new Test Session based on each Build User supplied appScanner resourceObject
  And the Emissary sites tree is populated with each Build User supplied route of each appScanner resourceObject
  And the Emissary authentication is configured for the SUT
  And the API is spidered for each appScanner resourceObject

Scenario: The application should not contain vulnerabilities known to the Emissary that exceed the Build User defined threshold
  Given the active scanners are configured
  When the active scan is run
  Then the vulnerability count should not exceed the Build User defined threshold of vulnerabilities known to the Emissary

`;
  const testPlan = await getAnAppInstance().testPlan(testJob);
  t.is(testPlan, expectedTestPlan);
});

