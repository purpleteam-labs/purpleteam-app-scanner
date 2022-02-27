// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

class PostScanning {
  constructor({ publisher, baseUrl, zAp }) {
    if (this.constructor === PostScanning) throw new Error('Abstract classes can\'t be instantiated.');
    this.publisher = publisher;
    this.baseUrl = baseUrl;
    this.zAp = zAp;
  }

  process() {
    throw new Error(`Method "process()" of ${this.constructor.name} is abstract.`);
  }
}

export default PostScanning;
