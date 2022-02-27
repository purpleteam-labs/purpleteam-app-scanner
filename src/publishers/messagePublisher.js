// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import redis from 'redis';

let log;
let client;
const baseChannel = 'app';


const publish = async (testSessionId, data, event = 'testerProgress') => {
  if (!testSessionId) log.warning(`There was no testSessionId supplied to the publish method of messagePublisher for the event: "${event}" with data: "${data}"`, { tags: ['messagePublisher'] });
  if (typeof event !== 'string') throw new Error('"event" must be a string');
  if (!event.startsWith('tester')) throw new Error('"event" must start with the text "tester"');

  const eventNoFirstWord = event.split('tester')[1];
  const eventProperty = `${eventNoFirstWord.charAt(0).toLowerCase()}${eventNoFirstWord.substring(1)}`;
  const message = JSON.stringify({ id: Date.now(), event, data: { [eventProperty]: data } });

  const channel = `${baseChannel}${testSessionId ? `-${testSessionId}` : ''}`;

  // log.debug(`Redis client publishing to the channel: "${channel}", message: ${message}`, { tags: ['messagePublisher'] });
  await client.publish(channel, message)
    .catch((e) => {
      log.warning(`The redis client failed to publish to the channel: "${channel}". The error was: ${e}`, { tags: ['messagePublisher'] });
      throw e;
    });
};


const pubLog = async ({ testSessionId, logLevel, textData, tagObj, event }) => {
  await publish(testSessionId, textData, event);
  log[logLevel](textData, tagObj);
};


const init = async (options) => {
  if (!client) {
    ({ log } = options);
    client = redis.createClient(options.redis);
    client.on('error', (error) => { log.error(`An error event was received from the redis client: "${error.message}".`, { tags: ['messagePublisher'] }); });
    log.info(`Attempting to establish a connection with redis at "${options.redis.socket.host}:${options.redis.socket.port}".`, { tags: [`pid-${process.pid}`, 'messagePublisher'] });
    await client.connect()
      .then(() => {
        log.info(`A connection is established to the redis client at "${options.redis.socket.host}:${options.redis.socket.port}".`, { tags: [`pid-${process.pid}`, 'messagePublisher'] });
      })
      .catch((e) => {
        log.error(`An error occurred while the redis client was trying to connect. The error was: "${e.message}".`, { tags: [`pid-${process.pid}`, 'messagePublisher'] });
      });
  }
  return { publish, pubLog };
};

export default { init, publish, pubLog };
export { init, publish, pubLog };
