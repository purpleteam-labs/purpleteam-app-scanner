// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import server from './src/server.js';

const init = async () => {
  await server.registerPlugins();
  const startedServer = await server.start();
  startedServer.log(['startup'], `purpleteam-app-scanner running at: ${startedServer.info.uri} in ${process.env.NODE_ENV} mode.`);
};

process.on('unhandledRejection', (err) => {
  console.log(err); // eslint-disable-line no-console
  process.exit(1);
});

init();
