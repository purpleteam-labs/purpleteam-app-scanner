// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of PurpleTeam.

// PurpleTeam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// PurpleTeam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this PurpleTeam project. If not, see <https://www.gnu.org/licenses/>.

const redis = require('redis');

let log;
let client;
const baseChannel = 'app';


const publish = (testSessionId, data, event = 'testerProgress') => {
  if (!testSessionId) log.warning(`There was no testSessionId supplied to the publish method of messagePublisher for the event: "${event}" with data: "${data}"`, { tags: ['messagePublisher'] });
  if (typeof event !== 'string') throw new Error('"event" must be a string');
  if (!event.startsWith('tester')) throw new Error('"event" must start with the text "tester"');

  const eventNoFirstWord = event.split('tester')[1];
  const eventProperty = `${eventNoFirstWord.charAt(0).toLowerCase()}${eventNoFirstWord.substring(1)}`;
  const message = JSON.stringify({ id: Date.now(), event, data: { [eventProperty]: data } });

  const channel = `${baseChannel}${testSessionId ? `-${testSessionId}` : ''}`;
  try {
    // log.debug(`Redis client publishing to the channel: "${channel}", message: ${message}`, { tags: ['messagePublisher'] });
    client.publish(channel, message);
  } catch (e) {
    log.warning(`The redis client failed to publish to the channel: "${channel}". The error was: ${e}`, { tags: ['messagePublisher'] });
    throw e;
  }
};


const pubLog = ({ testSessionId, logLevel, textData, tagObj, event }) => {
  publish(testSessionId, textData, event);
  log[logLevel](textData, tagObj);
};


const init = (options) => {
  if (!client) {
    ({ log } = options);
    client = redis.createClient(options.redis);
    client.on('error', (error) => { log.error(`An error event was received from the redis client: "${error.message}".`, { tags: ['messagePublisher'] }); });
    client.on('ready', () => { log.info(`A connection is established to the redis client at "${client.address}".`, { tags: [`pid-${process.pid}`, 'messagePublisher'] }); });
    log.info(`Attempting to establish a connection with redis at "${options.redis.host}:${options.redis.port}".`, { tags: [`pid-${process.pid}`, 'messagePublisher'] });
  }
  return { publish, pubLog };
};


module.exports = {
  init,
  publish,
  pubLog
};
