// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import { init as initPtLogger } from 'purpleteam-logger';
import { init as initMessagePublisher } from '../publishers/messagePublisher.js';
import config from '../../config/config.js';
import sUt from '../api/app/do/index.js';
import zAp from '../emissaries/zAp.js';

const log = initPtLogger(config.get('logger'));
const messagePublisher = await initMessagePublisher({ log, redis: config.get('redis.clientCreationOptions') });

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

export default ParentWorld;
