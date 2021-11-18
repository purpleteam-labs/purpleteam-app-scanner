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

const Joi = require('joi');
const Sut = require('./sUt');
/* eslint-disable import/no-dynamic-require */

// Strategies.

/* eslint-enable import/no-dynamic-require */

class Api extends Sut {
  #configSchemaProps;
  #sutSchema;
  // Strategies specific to Api.
  // ...

  #createSchema() {
    this.#sutSchema = Joi.object({ });
  }

  async #selectStrategies() {
    super.selectStrategies();
  }

  async initialise() { // eslint-disable-line class-methods-use-this
    // Todo: Populate as required.


  }

  constructor({ log, publisher, sutProperties }) {
    super({ log, publisher });
    this.#configSchemaProps = this.config.getSchema()._cvtProperties; // eslint-disable-line no-underscore-dangle
    this.#createSchema();
    this.initialiseProperties(sutProperties, this.#sutSchema);
    this.#selectStrategies();
  }

  getSitesTreeSutAuthenticationPopulationStrategy() {
    throw new Error(`Method "getSitesTreeSutAuthenticationPopulationStrategy()" is not applicable to SUT ${this.constructor.name}'s'`);
  }

  getSitesTreePopulationStrategy() {
    return {
      ...super.getSitesTreePopulationStrategy(),
      args: { /* Todo: args specific to the API specific strategy */ }
    };
  }

  getEmissaryAuthenticationStrategy() {
    return {
      ...super.getEmissaryAuthenticationStrategy(),
      args: { /* Todo: args specific to the API specific strategy */ }
    };
  }

  getSpiderStrategy() {
    return {
      ...super.getSpiderStrategy(),
      args: { /* Todo: args specific to the API specific strategy */ }
    };
  }

  getScannersStrategy() {
    return {
      ...super.getScannersStrategy(),
      args: { /* Todo: args specific to the API specific strategy */ }
    };
  }

  getScanningStrategy() {
    return {
      ...super.getScanningStrategy(),
      args: { /* Todo: args specific to the API specific strategy */ }
    };
  }

  getPostScanningStrategy() {
    return {
      ...super.getPostScanningStrategy(),
      args: { /* Todo: args specific to the API specific strategy */ }
    };
  }

  getReportingStrategy() {
    return {
      ...super.getReportingStrategy(),
      args: { /* Todo: args specific to the API specific strategy */ }
    };
  }
}

module.exports = Api;
