// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

module.exports = {
  rules: {
    // The Cucumber world is exposed as 'this' to hooks and steps: https://github.com/cucumber/cucumber-js/blob/52d0e328729f1f9d2ae05d72426a3377a1aae9cc/docs/faq.md
    'func-names': ['error', 'never']
  }
};
