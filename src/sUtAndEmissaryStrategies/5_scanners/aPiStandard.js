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


const Scanners = require('./strategy');

class ApiStandard extends Scanners {
  #sutPropertiesSubSet;
  #fileName = 'aPiStandard';

  constructor({ log, publisher, baseUrl, sutPropertiesSubSet, zAp /* Other props */ }) {
    super({ log, publisher, baseUrl, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
  }

  async configure() {
    const methodName = 'configure';
    const { id: testSessionId } = this.#sutPropertiesSubSet;

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    throw new Error(`Method "${methodName}()" of ${this.constructor.name} is not implemented.`);
    // Todo: implement.
  }
}

module.exports = ApiStandard;
