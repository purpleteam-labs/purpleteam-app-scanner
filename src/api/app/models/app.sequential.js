// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of purpleteam.

// purpleteam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// purpleteam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with purpleteam. If not, see <https://www.gnu.org/licenses/>.

const cucumber = require('@cucumber/cucumber');

const sequential = (runParams) => {
  const { model, model: { createCucumberArgs, log, publisher }, sessionsProps } = runParams;

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

  model.emissariesDeployed = true;
  // If you want to debug the tests before execution returns, uncomment the await, make this function async and add await to the calling function.
  /* await */cucumberCliInstance.run()
    .then(async (succeeded) => {
      log.notice(`Output of cucumberCli after test run: ${JSON.stringify(succeeded)}.`, { tags: ['app'] });
      publisher.pubLog({ testSessionId: sessionsProps[1].testSession.id, logLevel: 'notice', textData: `Tester finished: {sessionId: ${sessionsProps[1].testSession.id}, tester: app}.`, tagObj: { tags: ['runCuc'] } });
    }).catch((error) => log.error(error, { tags: ['app'] }));

  return 'App tests are now running.';
};

module.exports = sequential;
