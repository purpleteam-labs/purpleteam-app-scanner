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

const convict = require('convict');
const { duration } = require('convict-format-with-moment');
const { url } = require('convict-format-with-validator');
const path = require('path');

convict.addFormat(duration);
convict.addFormat(url);

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
  processMonitoring: {
    on: {
      doc: 'Whether or not to capture and log process events.',
      format: 'Boolean',
      default: false
    },
    interval: {
      doc: 'The interval in milliseconds to capture and log the process events.',
      format: 'duration',
      default: 10000
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
  s2Containers: {
    serviceDiscoveryServiceInstances: {
      timeoutToBeAvailable: {
        doc: 'The duration in milliseconds before giving up on waiting for the s2 Service Discovery Service Instances to be available.',
        format: 'duration',
        default: 200000
      },
      retryIntervalToBeAvailable: {
        doc: 'The retry interval in milliseconds for the s2 Service Discovery Service Instances to be available.',
        format: 'duration',
        default: 5000
      }
    },
    responsive: {
      timeout: {
        doc: 'The duration in milliseconds before giving up on waiting for the s2 containers to be responsive.',
        format: 'duration',
        default: 120000
      },
      retryInterval: {
        doc: 'The retry interval in milliseconds for the s2 containers to be responsive.',
        format: 'duration',
        default: 10000
      }
    }
  },
  emissary: {
    protocol: {
      doc: 'The protocol that the Emissary is listening as.',
      format: ['https', 'http'],
      default: 'https'
    },
    hostname: {
      doc: 'The hostname (IP or name) address of the Emissary host.',
      format: String,
      default: '240.0.0.0'
    },
    port: {
      doc: 'The port that the Emissary is listening on.',
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
      doc: 'The speed in milliseconds to poll the Zap API for feedback of test progress',
      format: 'duration',
      default: 5000
    },
    report: {
      dir: {
        doc: 'The location of the report.',
        format: String,
        default: '/var/log/purpleteam/outcomes/'
      },
      formats: {
        doc: 'The supported formats that reports will be written in.',
        format: Array,
        default: ['html', 'json', 'md']
      }
    },
    upload: {
      dir: {
        doc: 'The location in the Emissary container where the app-scanner can put files for the Emissary to consume.',
        format: String,
        default: '/mnt/purpleteam-app-scanner/'
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
    shutdownEmissariesAfterTest: {
      doc: 'Useful for inspecting Emissary containers during debugging.',
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
      doc: 'The number of alerts specified by the Build User that the alerts found by Zap should not exceed.',
      format: 'int',
      default: 0
    },
    method: {
      doc: 'The method used to attack the Build User supplied route.',
      format: ['GET', 'POST', 'PUT'],
      default: 'POST'
    },
    browser: {
      doc: 'The type of browser to run tests through.',
      format: ['chrome', 'firefox'],
      default: 'chrome'
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
    binary: {
      doc: 'The location of the Cucumber binary.',
      format: String,
      // default: `${process.cwd()}/node_modules/.bin/cucumber-js`
      default: `${process.cwd()}/bin/purpleteamParallelCucumber`
    },
    timeout: {
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
  upload: {
    dir: {
      doc: 'The location in the app-scanner container where the app-scanner can put files for the Emissary to consume.',
      format: String,
      default: '/mnt/purpleteam-app-scanner/'
    }
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
