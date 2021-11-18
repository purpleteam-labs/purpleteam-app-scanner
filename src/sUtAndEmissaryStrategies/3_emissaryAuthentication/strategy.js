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

class EmissaryAuthentication {
  constructor({ log, publisher, baseUrl, zAp }) {
    if (this.constructor === EmissaryAuthentication) throw new Error('Abstract classes can\'t be instantiated.');
    this.log = log;
    this.publisher = publisher;
    this.baseUrl = baseUrl;
    this.zAp = zAp;
  }

  async configure() {
    throw new Error(`Method "configure()" of ${this.constructor.name} is abstract.`);
  }
}

module.exports = EmissaryAuthentication;

