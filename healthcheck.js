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
