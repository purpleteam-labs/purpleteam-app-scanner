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

module.exports = [{
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
}];

