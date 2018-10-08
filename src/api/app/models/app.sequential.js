const cucumber = require('cucumber');

const sequential = (runParams) => {
  const { model, model: { createCucumberArgs, publisher }, sessionsProps } = runParams;

  // For testing single session. Cucumber won't run twice in the same process. This only runs single testSession.
  //   Tried using this (https://github.com/cucumber/cucumber-js/issues/786#issuecomment-422060468) approach with using the same support library.

  const cucumberArgs = createCucumberArgs.call(model, sessionsProps[1]);


  const cucumberCliStdout = {
    publisher,
    write(...writeParams) {
      const [str] = writeParams;
      publisher.pubLog({ testSessionId: sessionsProps[1].testSession.id, logLevel: 'notice', textData: str, tagObj: { tags: ['app.sequential', 'cucumberCLI-stdout-write'] } });
    }
  };

  const cucumberCliInstance = new cucumber.Cli({
    argv: ['node', ...cucumberArgs],
    cwd: process.cwd(),
    stdout: cucumberCliStdout
  });

  model.slavesDeployed = true;
  // If you want to debug the tests before execution returns, uncomment the await, make this function async and add await to the calling function.
  /* await */cucumberCliInstance.run()
    .then(async (succeeded) => {
      this.log.notice(`Output of cucumberCli after test run: ${JSON.stringify(succeeded)}.`, { tags: ['app'] });
      publisher.pubLog({ testSessionId: sessionsProps[1].testSession.id, logLevel: 'notice', textData: `Tester finished: {sessionId: ${sessionsProps[1].testSession.id}, tester: app}`, tagObj: { tags: ['runCuc'] } });
    }).catch(error => this.log.error(error, { tags: ['app'] }));
};

module.exports = sequential;
