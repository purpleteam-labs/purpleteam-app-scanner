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
const Bourne = require('@hapi/bourne');
const { Writable } = require('stream');

const config = require('config/config');
const log = require('purpleteam-logger').init(config.get('logger'));
const publisher = require('src/publishers/messagePublisher').init({ log, redis: config.get('redis.clientCreationOptions') });

// Following code taken from https://github.com/cucumber/cucumber-js/blob/cfc9b4a1db5b97d95350ce41144ae69084096adc/src/cli/run.js
//   then modified:
//     Patched stdout
//     Removed verror for now

function exitWithError(error) {
  console.error(/* VError.fullStack(error) */error); // eslint-disable-line no-console
  process.exit(1);
}

let testSessionId = 'To be assigned';


// Details around implementing: https://github.com/cucumber/common/issues/1586
// This must be an IFormatterStream: https://github.com/cucumber/cucumber-js/blob/2e744ae80d84ed996e198769bb9cb33568ec5d5f/src/formatter/index.ts#L12
// Node Doc: https://nodejs.org/docs/latest-v14.x/api/stream.html#stream_implementing_a_writable_stream
const cucumberCliStdout = new Writable({
  decodeStrings: false, // This keeps the string as a string.
  write(chunk, encoding, callback) {
    // There is a toString for string and buffer, so we're going with simple and easy.
    // If it turns out we get multi-byte buffers, we'll need to use string_decoder: https://nodejs.org/docs/latest-v14.x/api/stream.html#stream_decoding_buffers_in_a_writable_stream
    try {
      publisher.pubLog({ testSessionId, logLevel: 'notice', textData: chunk.toString(), tagObj: { tags: [`pid-${process.pid}`, 'runCuc', 'cucumberCLI-stdout-write'] } });
    } catch (e) {
      callback(new Error(`There was a problem publishing to publisher.pubLog in runCuc. The error was: ${e}`));
      return;
    }
    callback();
  }
});

exports.default = async function run() {
  const cwd = process.cwd();
  const worldParametersV = 11;
  const worldParameters = Bourne.parse(process.argv[worldParametersV]);
  testSessionId = worldParameters.sutProperties.testSession.id;
  // Uncomment the following to check the world parameters.
  /*
  publisher.pubLog({
    testSessionId,
    logLevel: 'notice',
    textData: `The world parameters for this test session are:\n${JSON.stringify(worldParameters, null, 2)} `,
    tagObj: { tags: ['runCuc', 'cucumberCLI-stdout-write'] }
  });
  */

  const cucumberCliInstance = new cucumber.Cli({
    argv: process.argv,
    cwd,
    stdout: cucumberCliStdout
  });

  let result;
  try {
    result = await cucumberCliInstance.run();
    log.info(`The cucumber result for testSession: ${testSessionId} was ${JSON.stringify(result)}.`, { tags: ['runCuc'] });
    publisher.pubLog({ testSessionId, logLevel: 'notice', textData: `Tester finished: {sessionId: ${testSessionId}, tester: app}.`, tagObj: { tags: ['runCuc'] } });
  } catch (error) {
    exitWithError(error);
  }


  const exitCode = result.success ? 0 : 1;

  process.exit(exitCode);
  // if (result.shouldExitImmediately) {
  //   process.exit(exitCode);
  // } else {
  //   process.exitCode = exitCode;
  // }
};
