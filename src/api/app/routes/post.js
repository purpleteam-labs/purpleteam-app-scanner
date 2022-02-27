// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

export default [{
  method: 'POST',
  path: '/test-plan',
  handler: async (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;
    const { payload: testJob } = request;

    return respToolkit.response(await model.testPlan(testJob));
  }
}, {
  method: 'POST',
  path: '/init-tester',
  handler: async (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;
    const { payload: testJob } = request;

    return respToolkit.response(await model.initTester(testJob));
  }
}, {
  method: 'POST',
  path: '/start-tester',
  handler: (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;

    return respToolkit.response(model.startCucs());
  }
}, {
  method: 'POST',
  path: '/reset-tester',
  handler: async (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;

    return respToolkit.response(await model.reset());
  }
}];

