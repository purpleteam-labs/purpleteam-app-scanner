const convict = require('convict');
const path = require('path');

const internals = { aws_region: process.env.AWS_REGION || 'dummy-region' };

const schema = {
  env: {
    doc: 'The application environment.',
    format: ['cloud', 'local', 'test'],
    default: 'cloud',
    env: 'NODE_ENV'
  },
  logger: {
    level: {
      doc: 'Write all log events with this level and below. Syslog levels used: https://github.com/winstonjs/winston#logging-levels',
      format: ['emerg', 'alert', 'crit', 'error', 'warning', 'notice', 'info', 'debug'],
      default: 'notice'
    }
  },
  debug: {
    execArgvDebugString: {
      doc: 'The process.execArgv debug string if the process is running with it. Used to initiate child processes with in order to debug them.',
      format: String,
      default: process.execArgv.indexOf('--inspect-brk=0.0.0.0') !== -1 ? '--inspect-brk=0.0.0.0' : undefined
    },
    firstChildProcessInspectPort: {
      doc: 'The first child process debug port to attach to as defined in the .vscode launch.json',
      format: 'port',
      default: 9329
    }
  },
  host: {
    port: {
      doc: 'The port of this host.',
      format: 'port',
      default: 3000,
      env: 'PORT'
    },
    host: {
      doc: 'The IP address or hostname of this host.',
      format: String,
      default: '240.0.0.0'
    }
  },
  redis: {
    clientCreationOptions: {
      doc: 'The options used for creating the redis client.',
      format: (val) => typeof val === 'object',
      default: {
        port: 6379,
        host: 'redis'
        // "host": "172.17.0.2" // host networking or not running in container
      }
    }
  },
  slave: {
    protocol: {
      doc: 'The protocol that the slave is listening as.',
      format: ['https', 'http'],
      default: 'https'
    },
    hostname: {
      doc: 'The hostname (IP or name) address of the slave host.',
      format: String,
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
      env: 'ZAP_API_KEY',
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
        default: '/var/log/purpleteam/outcomes/'
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
    },
    shutdownSlavesAfterTest: {
      doc: 'Useful for inspecting slave containers during debugging.',
      format: 'Boolean',
      default: true
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
      // default: `${process.cwd()}/node_modules/.bin/cucumber-js`
      default: `${process.cwd()}/bin/purpleteamParallelCucumber`
    },
    timeOut: {
      doc: 'The value used to set the timeout (https://github.com/cucumber/cucumber-js/blob/master/docs/support_files/timeouts.md)',
      format: 'duration',
      default: 5000
    }
  },
  results: {
    dir: {
      doc: 'The location of the results.',
      format: String,
      default: '/var/log/purpleteam/outcomes/'
    }
  },
  runType: {
    doc: 'The type to run the cucumber tests.',
    format: ['parallel', 'sequential', 'publisher'],
    // If parallel is not selected, the results archive will not be created, because all testSessions never finish.
    // We check that all testSessions are finished before creating archive in the orchestrator's orchestrate.areAllTestSessionsOfAllTestersFinished
    default: 'parallel'
  },
  cloud: {
    function: {
      region: {
        doc: 'The region of the functions being invoked.',
        format: String,
        default: internals.aws_region
      },
      lambdaEndpoint: {
        doc: 'The endpoint of the Lambda functions being invoked.',
        format: 'url',
        default: `https://lambda.${internals.aws_region}.amazonaws.com`
      },
      serviceDiscoveryEndpoint: {
        doc: 'The endpoint of the Service Discovery being invoked.',
        format: 'url',
        default: `https://serviceDiscovery.${internals.aws_region}.amazonaws.com`
      }
    }
  }
};

const config = convict(schema);
config.loadFile(path.join(__dirname, `config.${process.env.NODE_ENV}.json`));
config.validate();

module.exports = config;
