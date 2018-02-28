'use strict';

const convict = require('convict');
const path = require('path');

const schema = {
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NOE_ENV'
  },
  sut: {
    port: {
      doc: 'The port of the system under test.',
      format: 'port',
      default: 4000,
      env: 'PORT'
    },
    hostIp: {
      doc: 'The IP address of the system under test.',
      format: 'ipaddress',
      default: '240.0.0.0'
    }
  },
  zap: {
    hostIp: {
      doc: 'The IP address of the Zap host.',
      format: 'ipaddress',
      default: '240.0.0.0'
    },
    port: {
      doc: 'The port that Zap is listening on.',
      format: 'port',
      default: 8080
    },
    apiKey: {
      doc: 'The key required to send to access all API operations from 2.6.0 onwards. 2.4.1 onwards required an API key to invoke API operations that made changes to Zap.',
      format: String,
      default: ''
    },
    apiFeedbackSpeed: {
      doc: "The speed to poll the Zap API for feedback of test progress",
      format: 'duration',
      default: 5000
    }
  }
};

const config = convict(schema);
config .loadFile(path.join(__dirname, 'config.' + config.get('env') + '.json'));
config.validate();

module.exports = config;
