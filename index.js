const server = require('./src/server');

const init = async () => {
  await server.start();
  console.log(`purpleteam-app-scanner running at: ${server.info.uri}`); // eslint-disable-line no-console
};

process.on('unhandledRejection', (err) => {
  console.log(err); // eslint-disable-line no-console
  process.exit(1);
});

init();
