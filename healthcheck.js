// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

const http = require('http');
require('convict');
const config = require('./config/config');

const options = {
  host: config.get('host.host'),
  port: config.get('host.port'),
  path: '/status',
  timeout: 2000
};

/* eslint-disable no-console */
const request = http.request(options, (res) => {
  console.log(`StatusCode: ${res.statusCode}`);
  if (res.statusCode === 200) process.exit(0);
  process.exit(1);
});

request.on('error', (err) => {
  console.log(`ERROR: ${err}`);
  process.exit(1);
});
/* eslint-enable no-console */

request.end();
