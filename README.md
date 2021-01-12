<div align="center">
  <br/>
  <a href="https://purpleteam-labs.com" title="purpleteam">
    <img width=900px src="https://github.com/purpleteam-labs/purpleteam/blob/main/assets/images/purpleteam-banner.png" alt="purpleteam logo">
  </a>
  <br/>
<br/>
<h2>purpleteam application scanner</h2><br/>
  Application scanning component of <a href="https://purpleteam-labs.com/" title="purpleteam">purpleteam</a> - Currently in alpha
<br/><br/>

<a href="https://www.gnu.org/licenses/agpl-3.0" title="license">
  <img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="GNU AGPL">
</a>

<a href="https://github.com/purpleteam-labs/purpleteam-app-scanner/commits/main" title="pipeline status">
  <img src="https://github.com/purpleteam-labs/purpleteam-app-scanner/workflows/Node.js%20CI/badge.svg" alt="pipeline status">
</a>

<a href='https://coveralls.io/github/purpleteam-labs/purpleteam-app-scanner?branch=main'>
  <img src='https://coveralls.io/repos/github/purpleteam-labs/purpleteam-app-scanner/badge.svg?branch=main' alt='test coverage'>
</a>

<a href="https://snyk.io/test/github/purpleteam-labs/purpleteam-app-scanner?targetFile=package.json" title="known vulnerabilities">
  <img src="https://snyk.io/test/github/purpleteam-labs/purpleteam-app-scanner/badge.svg?targetFile=package.json" alt="known vulnerabilities"/>
</a>

<br/><br/><br/>
</div>


Clone this repository.

`cd` to the repository root directory and run:  
```shell
npm install
```

# Configuration

Copy the config/config.example.json to config/config.local.json.  
Use the config/config.js for documentation and further examples.  

Take the Zap API Key that you set-up in the [purpleteam-s2-containers](https://github.com/purpleteam-labs/purpleteam-s2-containers) project and replace the `<zap-api-key-here>` value in the config.local.json file.

The following two values should be the same. They should also match the value of the orchestrator `outcomes.dir`:

**`slave.report.dir`** Configure this value. This needs to be a directory of your choosing that both the orchestrator and app-scanner containers use. The directory you choose and configure needs group `rwx` permissions applied to it becuase the orchestrator and tester containers share the same group, they also read, write and delete outcome files within this directory.

**`results.dir`** Configure this value. This needs to be a directory of your choosing that both the orchestrator and app-scanner containers use. The directory you choose and configure needs group `rwx` permissions applied to it becuase the orchestrator and tester containers share the same group, they also read, write and delete outcome files within this directory.

