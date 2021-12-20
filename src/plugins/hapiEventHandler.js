// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

// Doc: https://christiangiacomi.com/posts/events-in-hapijs/
const subscribeToEvents = (server, options) => {
  const { log, logLevels, processMonitoring: { on: processMonitoringOn, interval: processMonitoringInterval } } = options;

  server.events.on('log', (event, tags) => {
    const level = logLevels.find((e) => tags[e]) || 'info';
    const tagsWithoutLogLevel = event.tags.filter((t) => t !== level);
    log[level](tags.error ? `Server error${event.error.message}` : event.data, tagsWithoutLogLevel.length ? { tags: tagsWithoutLogLevel } : {});
  });

  server.events.on('cachePolicy', (cachePolicy, cache, segment) => {
    log.info(`New cache policy created using cache: ${cache === undefined ? 'default' : cache} and segment: ${segment}`, { tags: 'hapiEventHandler' });
  });

  server.events.on('request', (request, event, tags) => {
    const { info: { remoteAddress, remotePort, host }, method, path } = request;
    const level = logLevels.find((e) => tags[e]) || 'info';
    const tagsWithoutLogLevel = event.tags.filter((t) => t !== level);
    log[level](`Request: ${event.request}, ${remoteAddress}:${remotePort} -> ${host} ${method.toUpperCase()} ${path} -> ${request.response?.statusCode ?? 'response: unavailable'}, ${tags.error && `error: ${event.error ? event.error.message : 'unknown'}`}`, { tags: [...(tagsWithoutLogLevel.length ? [...tagsWithoutLogLevel, 'hapiEventHandler'] : ['hapiEventHandler'])] });
  });

  server.events.on('response', (request) => {
    const { info: { remoteAddress, remotePort, host, received, completed }, method, path, response: { statusCode } } = request;
    log.info(`Response: ${remoteAddress}:${remotePort} -> ${host} ${method.toUpperCase()} ${path} -> ${statusCode ?? 'statusCode: unavailable'} (${completed - received}ms)`, { tags: 'hapiEventHandler' });
  });

  processMonitoringOn && setInterval(() => {
    const formatUptime = (seconds) => {
      const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
      const hrs = Math.floor(seconds / (60 * 60));
      const mins = Math.floor(seconds % (60 * 60) / 60); // eslint-disable-line no-mixed-operators
      const secs = Math.floor(seconds % 60);
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    };

    log.debug(`memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100}MiB, uptime: ${formatUptime(process.uptime())}`, { tags: ['hapiEventHandler'] }); // eslint-disable-line no-mixed-operators
  }, processMonitoringInterval);
};

module.exports = {
  name: 'hapiEventHandlerPlugin',
  version: '1.0.0',
  register: async (server, options) => {
    subscribeToEvents(server, options);
  }
};
