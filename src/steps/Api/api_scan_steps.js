// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

const { /* Before, */ Given, When, Then /* , setDefaultTimeout */, After } = require('@cucumber/cucumber');

/*
Before(() => {
  // Run before *every* scenario, no matter which feature or file.
  console.log('Im currently in a Before');

});
*/

Given('a new Test Session based on each Build User supplied appScanner resourceObject', async function () {
  await this.initialiseSut();
});

Given('the Emissary sites tree is populated with each Build User supplied route of each appScanner resourceObject', async function () {
  await this.zAp.populateSitesTreeWithSutRoutes(this.sUt);
});

Given('the Emissary authentication is configured for the SUT', async function () {
  await this.zAp.configureAuthentication(this.sUt);
});

Given('the API is spidered for each appScanner resourceObject', async function () {
  await this.zAp.spiderScan(this.sUt);
});

Given('the active scanners are configured', async function () {
  await this.zAp.configureActiveScanners(this.sUt);
});

When('the active scan is run', async function () {
  await this.zAp.activeScanRoutes(this.sUt);
});

Then('the vulnerability count should not exceed the Build User defined threshold of vulnerabilities known to the Emissary', function () {
  this.zAp.postScanProcess(this.sUt);
});

After({ tags: '@api_scan' }, async function () {
  await this.zAp.createReports(this.sUt);
});
