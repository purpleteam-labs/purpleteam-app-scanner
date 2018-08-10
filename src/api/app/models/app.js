// https://robbg.io/blog/2017-03-31-async-await-and-node-fs/
// http://2ality.com/2017/05/util-promisify.html
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const cucumber = require('cucumber');
const sut = require('src/api/app/do/sut');
const zap = require('src/slaves/zap');

class App {
  constructor(options) {
    const { log, slave, cucumber: cucumberConfig, results, publisher } = options;
    
    this.log = log;
    this.slave = slave;
    this.cucumber = cucumberConfig;
    this.results = results;
    this.publisher = publisher;
    this.slavesDeployed = false;
  }

  async runJob(testJob) {
    this.log.info(`${this.slavesDeployed ? 'slaves already deployed' : 'running testJob'}`, {tags: ['app']});
    if (this.slavesDeployed) return 'Request ignored. Slaves already deployed.';
    const testRoutes = testJob.included.filter(resourceObject => resourceObject.type === 'route');
    const testSessions = testJob.included.filter(resourceObject => resourceObject.type === 'testSession');

    debugger;

    const sessionsProps = testSessions.map(sesh => ({
      testRoutes,  
      protocol: testJob.data.attributes.sutProtocol,
      ip: testJob.data.attributes.sutIp,
      port: testJob.data.attributes.sutPort,
      browser: testJob.data.attributes.browser,
      loggedInIndicator: testJob.data.attributes.loggedInIndicator,
      context: {name: 'NodeGoat_Context'},
      authentication: testJob.data.attributes.sutAuthentication,
      reportFormats: testJob.data.attributes.reportFormats,
      testSession: sesh      // The data array contains the relationshops to the testSessions      
    }));
    debugger;




    // Get help with cucumber cli:
    // node ./node_modules/.bin/cucumber-js --help

    // Debug cucumber cli without actually running the tests (--dry-run). --dry-run to check that all glue code exists: https://github.com/cucumber/cucumber-jvm/issues/907
    // node --inspect-brk ./node_modules/.bin/cucumber-js --dry-run src/features --require src/steps --tags "not @simple_math"

////////////////////////////////////////////////////////////////////////////////////////

    // For testing single session. Cucumber won't run twice in the same process.
/*
    debugger;
    let cucumberArgs = this.createCucumberArgs(sessionsProps[1]);

    const cucumberCliInstance = new cucumber.Cli({
      argv: ['node', ...cucumberArgs],
      cwd: process.cwd(),
      stdout: process.stdout
    });
    debugger;
    this.slavesDeployed = true;
    await cucumberCliInstance.run()
    .then(async succeeded => {
      debugger;
      log.notice(`Output of cucumberCli after test run: ${JSON.stringify(succeeded)}.`, {tags: ['app']});
    }).catch((error) => {
      debugger;
      return log.error(error, {tags: ['app']});
    });

    debugger;
    return 'Tests are now running.';
*/    
    // End of testing single session.

////////////////////////////////////////////////////////////////////////////////////////

    // For complete sessionsProps
    // https://github.com/cucumber/cucumber-js/issues/786#issuecomment-372928596

      // paste this before your require child_process at the beginning of your main index file.
      /*
      (function() {
        var childProcess = require("child_process");
        var oldSpawn = childProcess.spawn;
        function mySpawn() {
            console.log('spawn called');
            console.log(arguments);
            var result = oldSpawn.apply(this, arguments);
            return result;
        }
        childProcess.spawn = mySpawn;
      })();
      */

    
    setInterval(() => {
      this.slavesDeployed = true;
      const sessionId = `${sessionsProps[0].testSession.id}`;
      this.log.debug('publishing to redis', { tags: ['app', sessionId] });
      try {
        this.publisher.publish(
          sessionId,
          JSON.stringify({ timestamp: Date.now(), event: 'testerProgress', data: { progress: `it is {red-fg}raining{/red-fg} cats and dogs${Date.now()}, session: ${sessionId}` } })
        );
      } catch (e) {
        this.log.error(`Error occured while attempting to publish to redis channel: "app", event: "testerProgress". Error was: ${e}`, { tags: ['app', sessionId] });
      }
    }, 1000);

    setInterval(() => {
      const sessionId = `${sessionsProps[1].testSession.id}`;
      this.log.debug('publishing to redis', { tags: ['app', sessionId] });
      try {
        this.publisher.publish(
          sessionId,
          JSON.stringify({ timestamp: Date.now(), event: 'testerProgress', data: { progress: `it is {red-fg}raining{/red-fg} cats and dogs${Date.now()}, session: ${sessionId}` } })
        );
      } catch (e) {
        this.log.error(`Error occured while attempting to publish to redis channel: "app", event: "testerProgress". Error was: ${e}`, { tags: ['app', sessionId] });
      }
    }, 1000);

    let pctComplete = 0;
    setInterval(() => {
      const sessionId = `${sessionsProps[1].testSession.id}`;
      this.log.debug('publishing to redis', { tags: ['app', sessionId] });
      pctComplete = pctComplete > 99 ? 0 : pctComplete + 1;
      //pctComplete = pctComplete >= 100 ? 100 : pctComplete + 1;
      try {
        this.publisher.publish(
          sessionId,
          JSON.stringify({ timestamp: Date.now(), event: 'testerPctComplete', data: { pctComplete } })
        );
      } catch (e) {
        this.log.error(`Error occured while attempting to publish to redis channel: "app", event: "testerPctComplete". Error was: ${e}`, { tags: ['app', sessionId] });
      }
    }, 1000);

    let bugCount = 0;
    setInterval(() => {
      const sessionId = `${sessionsProps[0].testSession.id}`;
      this.log.debug('publishing to redis - bugCount', { tags: ['app', sessionId] });
      bugCount++;      
      try {
        this.publisher.publish(
          sessionId,
          JSON.stringify({ timestamp: Date.now(), event: 'testerBugCount', data: { bugCount } })
        );
      } catch (e) {
        this.log.error(`Error occured while attempting to publish to redis channel: "app", event: "testerBugCount". Error was: ${e}`, { tags: ['app', sessionId] });
      }
    }, 2000);


    /*
    // Todo: KC: Need to check whether testers are already running or not.
    for (let sessionProps of sessionsProps) {

      let cucumberArgs = this.createCucumberArgs(sessionProps);
      debugger;

     // We may end up having to hava an instance of Zap per test session in order to acheive isolation.
     // Currently reports for all test sessions will be the same.
     // Setting aScannerAttackStrength, aScannerAlertThreshold with single instance Zap will simply be a last one wins scenario.
     // We could also look at using spawnSync, but then, Zap would need to be restarted, which defeats the point of creating a process, other thn the fact that the Cucumber Cli won't run twice.
      
      const { spawn } = require('child_process');
      const cucCli = spawn('node', cucumberArgs, {cwd: process.cwd(), env: process.env, argv0: process.argv[0]});
      this.slavesDeployed = true;

      cucCli.stdout.on('data', (data) => {
        debugger;
        process.stdout.write(data);
      })

      cucCli.stderr.on('data', (data) => {
        debugger;
        process.stdout.write(data);
      })

      cucCli.on('close', (code) => {
        debugger;
        process.stdout.write(`child process "cucumber Cli" running session with id "${sessionProps.testSession.id}" exited with code ${code}`, {tags: ['app']});        
      })

      cucCli.on('error', (err) => {
        debugger;
        process.stdout.write('Failed to start subprocess.', {tags: ['app']});
      });
    }
    */
    return 'App tests are now running.'; // This needs to be per session.

////////////////////////////////////////////////////////////////////////////////////////



  }


  async testPlan(testJob) {
    const cucumberArgs = this.createCucumberArgs();
    const cucumberCliInstance = new cucumber.Cli({
      argv: ['node', ...cucumberArgs],
      cwd: process.cwd(),
      stdout: process.stdout
    });
    const activeTestCases = await this.getActiveTestCases(cucumberCliInstance);
    const testPlan = await this.testPlanText(activeTestCases);
    return testPlan;
  }


  createCucumberArgs(sutProps) {

    //sut.validateProperties(sutProperties);

    const slaveProperties = {
      protocol: this.slave.protocol,
      ip: this.slave.ip,
      port: this.slave.port,
      apiKey: this.slave.apiKey,
      apiFeedbackSpeed: this.slave.apiFeedbackSpeed,
      reportDir: this.slave.report.dir,
      spider: this.slave.spider
    };

    //zap.validateProperties(slaveProperties);
    
    const cucumberParameters = {
      slaveProperties,
      sutProperties: sutProps ? sutProps : {},
      cucumber: {
        timeOut: this.cucumber.timeOut
      }
    };

    const parameters = JSON.stringify(cucumberParameters);

    const cucumberArgs = [
      this.cucumber.binary,
      this.cucumber.features,
      '--require',
      this.cucumber.steps,
      /*'--exit',*/
      `--format=json:${this.results.uri}`,
      '--tags',
      this.cucumber.tagExpression,
      '--world-parameters',
      parameters
    ];


    return cucumberArgs;
  }


  async getActiveTestCases(cucumberCli) {
    // Files to work the below out where in:
    // https://github.com/cucumber/cucumber-js/blob/master/src/cli/index.js
    // https://github.com/cucumber/cucumber-js/blob/master/src/cli/helpers.js#L20
    // https://github.com/cucumber/cucumber-js/blob/master/src/cli/configuration_builder.js
    const configuration = await cucumberCli.getConfiguration();
    const activeTestCases = await cucumber.getTestCasesFromFilesystem({
      cwd: process.cwd(),
      eventBroadcaster: ( () => new (require('events'))() )(),
      featureDefaultLanguage: configuration.featureDefaultLanguage,
      featurePaths: configuration.featurePaths,
      order: configuration.order,  
      pickleFilter: ( () => new (require('cucumber/lib/pickle_filter')).default(configuration.pickleFilterOptions) )()
    });
    return activeTestCases;
  }


  async testPlanText(activeTestCases) {
    const activeTestFileUris = activeTestCases.map(currentValue => currentValue.uri).filter( (currentValue, currentElementIndex, urisOfActiveTestCases) => urisOfActiveTestCases.indexOf(currentValue) === currentElementIndex );
    return (await Promise.all(activeTestFileUris.map( featureFileUri => readFileAsync(`${process.cwd()}/${featureFileUri}`, {encoding: 'utf8'}) )))
    .reduce( (accumulatedFeatures, feature) => accumulatedFeatures.concat(...['\n\n', feature]) );
  }


  async testResult() {

    let result;

    try {
      result = await readFileAsync(this.results.uri, {encoding: 'utf8'})
    }
    catch (err) {
      this.log.error(`Could not read test results file, the error was: ${err}.`, {tags: ['app', 'testResult()']});
    }

    return result;
  }






}



module.exports = App;
