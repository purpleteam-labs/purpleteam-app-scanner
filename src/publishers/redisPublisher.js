const redis = require('redis');

let log;
let client;
const baseChannel = 'app';


const publish = (sessionId, data) => {
  const channel = `${baseChannel}${sessionId ? `-${sessionId}` : ''}`;
  try {
    log.debug(`Redis client publishing to the channel: "${channel}".`, { tags: ['redisPublisher'] });
    client.publish(channel, data);
  } catch (e) {
    log.warning(`The redis client failed to publish to the channel: "${channel}". The error was: ${e}`, { tags: ['redisPublisher'] });
    throw e;
  }
};


const init = (options) => {
  ({ log } = options);
  client = redis.createClient(options.redis);
  client.on('error', (error) => { log.error(`An error event was received from the redis client: "${error.message}"`, { tags: ['redisPublisher'] }); });
  client.on('ready', () => { log.notice(`A connection is established to the redis client at "${client.address}"`, { tags: ['redisPublisher'] }); });
  log.notice(`Attempting to establish a connection with redis at "${options.redis.host}:${options.redis.port}"`, { tags: ['redisPublisher'] });
  return { publish };
};


module.exports = {
  init,
  publish
};
