const { spawn } = require('child_process');

const internals = { nextChildProcessInspectPort: undefined };

internals.runTestSession = ({ appParams, runableSessionProps }) => {
  const {
    reset,
    app: {
      log,
      status,
      createCucumberArgs,
      numberOfTestSessions,
      testSessionDoneCount,
      incrementTestSessionDoneCount,
      emissary: { shutdownEmissariesAfterTest },
      debug: { execArgvDebugString }
    },
    appInstance
  } = appParams;

  const cucumberArgs = createCucumberArgs.call(appInstance, runableSessionProps);

  const cucCli = spawn('node', [...(execArgvDebugString ? [`${execArgvDebugString}:${internals.nextChildProcessInspectPort}`] : []), ...cucumberArgs], { cwd: process.cwd(), env: process.env, argv0: process.argv[0] });
  internals.nextChildProcessInspectPort += 1;
  log.info(`cucCli process with PID "${cucCli.pid}" has been spawned for Test Session with Id "${runableSessionProps.sessionProps.testSession.id}"`, { tags: ['app.cuc'] });
  status.call(appInstance, 'App tests are running.');

  cucCli.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  cucCli.stderr.on('data', (data) => {
    process.stdout.write(data);
  });

  cucCli.on('exit', async (code, signal) => {
    const message = `Child process "cucumber Cli" running session with id: "${runableSessionProps.sessionProps.testSession.id}" exited with code: "${code}", and signal: "${signal}".`;
    log.info(message, { tags: ['app.cuc'] });
    incrementTestSessionDoneCount();
    shutdownEmissariesAfterTest && testSessionDoneCount() >= numberOfTestSessions.call(appInstance) && await reset.call(appInstance);
  });

  cucCli.on('close', (code) => {
    const message = `"close" event was emitted with code: "${code}" for "cucumber Cli" running session with id "${runableSessionProps.sessionProps.testSession.id}".`;
    log[`${code === 0 ? 'info' : 'error'}`](message, { tags: ['app.cuc'] });
  });

  cucCli.on('error', async (err) => {
    process.stdout.write(`Failed to start sub-process. The error was: ${err}.`, { tags: ['app.cuc'] });
    shutdownEmissariesAfterTest && await reset.call(appInstance);
  });
};

const startCucs = (parameters) => {
  const { app: { debug: { firstChildProcessInspectPort }, testingProps: { runableSessionsProps } } } = parameters;
  internals.nextChildProcessInspectPort = firstChildProcessInspectPort;

  runableSessionsProps.forEach((runableSessionProps) => {
    internals.runTestSession({ appParams: parameters, runableSessionProps });
  });
};

module.exports = { startCucs };
