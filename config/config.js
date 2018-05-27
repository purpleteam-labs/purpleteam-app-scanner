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
    ip: {
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
    ip: {
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
    },
    report: {
      dir: {
        doc: 'The location of the report.',
        format: String,
        default: `${process.cwd()}/outcomes/`
      }
    },
    spider: {
      maxDepth: {
        doc: 'Sets the maximum depth the spider can crawl, 0 for unlimited depth.',
        format: 'int',
        default: 10
      },
      threadCount: {
        doc: 'Number of threads allocated to the Zap spider.',
        format: 'int',
        default: 10
      },
      maxChildren: {
        doc: 'limit the number of children scanned. 0 is interpreted as unlimited.',
        format: 'int',
        default: 10
      }
    }
  },
  sut: {
    aScannerAttackStrength: {
      doc: 'The attack strength of the active scanner.',
      format: ['LOW', 'MEDIUM', 'HIGH', 'INSANE'],
      default: 'HIGH'
    },
    aScannerAlertThreshold: {
      doc: 'The alert threshold of the active scanner.',
      format: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW'
    },
    alertThreshold: {
      doc: 'The number of alerts specified by the build user that the alerts found by Zap should not exceed.',
      format: 'int',
      default: 0
    },
    method: {
      doc: 'The method used to attack the build user supplied route.',
      format: ['GET', 'POST', 'PUT'],
      default: 'POST'
    },
    browser: {
      doc: 'The type of browser to run tests through.',
      format: ['chrome', 'firefox'],
      default: 'chrome'
    },
    reportFormat: {
      doc: 'The supported formats that reports may be written in.',
      format: ['html', 'json', 'md'],
      default: 'html'
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
  results: {
    uri: {
      doc: 'The location of the results.',
      format: String,
      default: `${process.cwd()}/outcomes/results.txt`
    }
  }
};

const config = convict(schema);
config.loadFile(path.join(__dirname, `config.${config.get('env')}.json`));
config.validate();

module.exports = config;
