const cucumber = require('cucumber');

let publisher;
let library;


const createCucCli = async (cucArgs, sessionProps) => {
  const cucumberCliStdout = {
    publisher,
    write(...writeParams) {
      const [str] = writeParams;
      publisher.pubLog({ testSessionId: sessionProps.testSession.id, logLevel: 'notice', textData: str, tagObj: { tags: ['app.sequential', 'cucumberCLI-stdout-write'] } });
    }
  };

  const cucumberCliInstance = new cucumber.Cli({
    argv: ['node', ...cucArgs],
    cwd: process.cwd(),
    stdout: cucumberCliStdout
  });

  if (!library) {
    const configuration = await cucumberCliInstance.getConfiguration();
    library = cucumberCliInstance.getSupportCodeLibrary(configuration);
  }

  cucumberCliInstance.getSupportCodeLibrary = () => library;
  return cucumberCliInstance;
};


const sequential = async (runParams) => {
  const { model, model: { createCucumberArgs }, sessionsProps } = runParams;
  ({ model: { publisher } } = runParams);

  // For testing single session. Cucumber won't run twice in the same process.

  for (const sessionProps of sessionsProps) { // eslint-disable-line no-restricted-syntax
    const cucumberArgs = createCucumberArgs.call(model, sessionProps);
    const cucumberCliInstance = await createCucCli(cucumberArgs, sessionProps);
  
    model.slavesDeployed = true;
    // If you want to debug the tests before execution returns, uncomment the await, make this function async and add await to the calling function.
    /* await */cucumberCliInstance.run()
      .then(async (succeeded) => {
        this.log.notice(`Output of cucumberCli after test run: ${JSON.stringify(succeeded)}.`, { tags: ['app'] });
      }).catch(error => this.log.error(error, { tags: ['app'] }));
  }
};

module.exports = sequential;
