// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import { Cli as CucCli } from '@cucumber/cucumber';
import Bourne from '@hapi/bourne';
import { Writable } from 'stream';
import { init as initPtLogger } from 'purpleteam-logger';
import { init as initPublisher } from '../publishers/messagePublisher.js';
import config from '../../config/config.js';

const log = initPtLogger(config.get('logger'));
const publisher = await initPublisher({ log, redis: config.get('redis.clientCreationOptions') });

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
      publisher.pubLog({ testSessionId, logLevel: 'info', textData: chunk.toString(), tagObj: { tags: [`pid-${process.pid}`, 'runCuc', 'cucumberCLI-stdout-write'] } });
    } catch (e) {
      callback(new Error(`There was a problem publishing to publisher.pubLog in runCuc. The error was: ${e}`));
      return;
    }
    callback();
  }
});

export default async function run() {
  const cwd = process.cwd();
  const worldParametersV = 11;
  const worldParameters = Bourne.parse(process.argv[worldParametersV]);
  testSessionId = worldParameters.sutProperties.testSession.id;
  // Uncomment the following to check the world parameters.
  /*
  publisher.pubLog({
    testSessionId,
    logLevel: 'notice',
    textData: `The world parameters for this Test Session are:\n${JSON.stringify(worldParameters, null, 2)} `,
    tagObj: { tags: ['runCuc', 'cucumberCLI-stdout-write'] }
  });
  */

  const cucumberCliInstance = new CucCli({
    argv: process.argv,
    cwd,
    stdout: cucumberCliStdout,
    env: {} // We really don't want to be passing our env in
  });

  let result;
  try {
    result = await cucumberCliInstance.run();
    log.info(`The cucumber result for testSession: ${testSessionId} was ${JSON.stringify(result)}.`, { tags: [`pid-${process.pid}`, 'runCuc'] });
    await publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Tester finished: {sessionId: ${testSessionId}, Tester: app}.`, tagObj: { tags: [`pid-${process.pid}`, 'runCuc'] } });
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
}
