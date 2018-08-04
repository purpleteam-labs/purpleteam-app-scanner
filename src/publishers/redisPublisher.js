const redis = require('redis');

let log;
let client;
const baseChannel = 'app';

const init = (options) => {
  log = options.log;
  client = redis.createClient(options.redis);
  return { publish };
};


const publish = (sessionId, data) => {
  const channel = `${baseChannel}${sessionId ? `-${sessionId}` : ''}`;
  try {
    log.debug(`Redis client publishing to the channel: "${channel}".`, { tags: ['redisPublisher'] })
    client.publish(channel, data);
  } catch (e) {
    log.warning(`The redis client failed to publish to the channel: "${channel}". The error was: ${e}`, { tags: ['redisPublisher'] });
    throw e;
  }
};


module.exports = {
  init,
  publish
};
