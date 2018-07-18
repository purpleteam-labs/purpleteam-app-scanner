const redis = require('redis');

let client;
const channel = 'app';

const init = (options) => {
  client = redis.createClient(options);
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
