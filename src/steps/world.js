// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

const config = require(`${process.cwd()}/config/config`); // eslint-disable-line import/no-dynamic-require
const log = require('purpleteam-logger').init(config.get('logger'));

const messagePublisher = require(`${process.cwd()}/src/publishers/messagePublisher`).init({ log, redis: config.get('redis.clientCreationOptions') }); // eslint-disable-line import/no-dynamic-require

const sUt = require(`${process.cwd()}/src/api/app/do`); // eslint-disable-line import/no-dynamic-require
const zAp = require(`${process.cwd()}/src/emissaries/zAp`); // eslint-disable-line import/no-dynamic-require

class ParentWorld {
  constructor({ attach, parameters }) {
    const { sutProperties, sutProperties: { sUtType, testSession: { id: testSessionId } } } = parameters;
    this.log = log;
    this.publisher = messagePublisher;
    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Constructing the cucumber world for session with id "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, 'world'] } });

    this.attach = attach;

    this.sUt = new sUt[sUtType]({ log, publisher: this.publisher, sutProperties });
    this.zAp = zAp;
    this.zAp.initialise({ log, publisher: this.publisher, emissaryProperties: { ...parameters.emissaryProperties } });
  }
}

module.exports = ParentWorld;
