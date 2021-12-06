// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of PurpleTeam.

// PurpleTeam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// PurpleTeam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this PurpleTeam project. If not, see <https://www.gnu.org/licenses/>.

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
