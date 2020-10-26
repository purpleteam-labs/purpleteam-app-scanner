<div align="center">
  <br/>
  <a href="https://purpleteam-labs.com" title="purpleteam">
    <img width=900px src="https://gitlab.com/purpleteam-labs/purpleteam/raw/master/assets/images/purpleteam-banner.png" alt="purpleteam logo">
  </a>
  <br/>
<br/>
<h2>purpleteam application scanner</h2><br/>
  Currently in heavy development
<br/><br/>

<a href="https://gitlab.com/purpleteam-labs/purpleteam-app-scanner/commits/master" title="pipeline status">
   <img src="https://gitlab.com/purpleteam-labs/purpleteam-app-scanner/badges/master/pipeline.svg" alt="pipeline status">
</a>

<a href="https://gitlab.com/purpleteam-labs/purpleteam-app-scanner/commits/master" title="test coverage">
   <img src="https://gitlab.com/purpleteam-labs/purpleteam-app-scanner/badges/master/coverage.svg" alt="test coverage">
</a>

<a href="https://snyk.io/test/github/purpleteam-labs/purpleteam-app-scanner?targetFile=package.json" title="known vulnerabilities">
  <img src="https://snyk.io/test/github/purpleteam-labs/purpleteam-app-scanner/badge.svg?targetFile=package.json" alt="known vulnerabilities"/>
</a>

<br/><br/><br/>
</div>


Clone this repository.

Along with the other components in the PurpleTeam solution:

* [purpleteam](https://gitlab.com/purpleteam-labs/purpleteam) (node.js CLI, driven from CI / nightly build)
* [purpleteam-orchestrator](https://gitlab.com/purpleteam-labs/purpleteam-orchestrator) (hapi.js orchestrator - SaaS interface, this package)
* purpleteam-advisor (machine learning module which continuously improves tests, plugs into orchestrator, future roadmap)
* Testers:
  * [purpleteam-app-scanner](https://gitlab.com/purpleteam-labs/purpleteam-app-scanner) (web app / api scanner)
  * purpleteam-server-scanner (web server scanner)
  * purpleteam-tls-checker (TLS checker)
  * etc

## Definitions

Described [here](https://gitlab.com/purpleteam-labs/purpleteam#definitions).

## Real Test

1. Once cloned, from the terminal run:
  
    `npm install`
  
2. Once the system under test (SUT) is running and accessible, from the terminal run the zaproxy container:
  
    `docker run -p 8080:8080 -it owasp/zap2docker-stable zap.sh -daemon -port 8080 -host 0.0.0.0 -config api.addrs.addr(0).name=<app-scanner-interface> -config api.addrs.addr(1).name=<zaproxy-interface> -config api.addrs.addr(2).name=zap -config api.key=<zap-api-key>`
  
3. Test the security of the System Under Test (SUT):
  
    `npm run testsecurity`

## Exercising the `/run-job`

This currently just runs dummy cucumber tests

1. Start the API:
  
    In one terminal: `npm start`
  
    In order to debug instead:
  
    1. `npm run debug`
    2. Open the chromium debugger
  
2. Hit the route:
  
    In second terminal: `curl -X POST http://localhost:3000/run-job`

    This should give you back the test plan, and the first terminal should display the cucumber summary on each route request.

## OWASP ZapProxy Details

* [What does Zap test for](https://github.com/zaproxy/zaproxy/wiki/FAQzaptests)
* [Scanner Rules](https://github.com/zaproxy/zaproxy/wiki/ScannerRules)

Passive scanning occurs [all the time automatically](https://groups.google.com/d/msg/zaproxy-develop/IZ98opaayRg/u8eFqaAZBgAJ) on a background thread.

* Fuzzing support [progress](https://github.com/zaproxy/zaproxy/issues/1689)
