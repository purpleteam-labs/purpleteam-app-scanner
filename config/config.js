const convict = require('convict');
const path = require('path');

const schema = {
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NOE_ENV'
  },
  host: {
    port: {
      doc: 'The port of this host.',
      format: 'port',
      default: 3000,
      env: 'PORT'
    },
    iP: {
      doc: 'The IP address of this host.',
      format: 'ipaddress',
      default: '240.0.0.0'
    }
  },
  slave: {
    protocol: {
      doc: 'The protocol that the slave is listening as.',
      format: ['https', 'http'],
      default: 'https'
    },
    iP: {
      doc: 'The IP address of the slave host.',
      format: 'ipaddress',
      default: '240.0.0.0'
    },
    port: {
      doc: 'The port that the slave is listening on.',
      format: 'port',
      default: 8080
    },
    apiKey: {
      doc: 'The key required to send to access all API operations from 2.6.0 onwards. 2.4.1 onwards required an API key to invoke API operations that made changes to Zap.',
      format: String,
      default: ''
    },
    apiFeedbackSpeed: {
      doc: 'The speed to poll the Zap API for feedback of test progress',
      format: 'duration',
      default: 5000
    }
  },
  cucumber: {
    features: {
      doc: 'The location of the feature files.',
      format: String,
      default: 'src/features'
    },
    steps: {
      doc: 'The location of the step files.',
      format: String,
      default: 'src/steps'
    },
    tagExpression: {
      doc: 'The tag expression without the \'--tag\' to run Cucumber with.',
      format: String,
      default: 'not @simple_math'
    },
    binary: {
      doc: 'The location of the Cucumber binary.',
      format: String,
      default: `${process.cwd()}/node_modules/.bin/cucumber-js`
    },
    timeOut: {
      doc: 'The value used to set the timeout (https://github.com/cucumber/cucumber-js/blob/master/docs/support_files/timeouts.md)',
      format: 'duration',
      default: 5000
    }
  },
  report: {
    uri: {
      doc: 'The location of the report.',
      format: String,
      default: `${process.cwd()}/reports/report.txt`
    }
  }
};

const config = convict(schema);
config.loadFile(path.join(__dirname, `config.${config.get('env')}.json`));
config.validate();

module.exports = config;
