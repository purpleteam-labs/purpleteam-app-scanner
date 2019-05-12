const http = require('http');
require('convict');
const config = require('./config/config.js');

const options = {
  host: config.get('host.ip'),
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
