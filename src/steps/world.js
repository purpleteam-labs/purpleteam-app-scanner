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
