const redis = require('redis');

let log;
let client;
const channel = 'app';

const init = (options) => {
  log = options.log;
  client = redis.createClient(options.redis);
  return {publish};
};


const publish = (data) => {
  try {
    client.publish(channel, data);
  }
  catch (e) {
    log.warning(`The redis client failed to publish to the channel: "app". The error was: ${e}`, {tags: ['redisPublisher']})
    throw e;
  }  
};


module.exports = {
  init,
  publish
};
