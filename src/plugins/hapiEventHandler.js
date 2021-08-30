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
