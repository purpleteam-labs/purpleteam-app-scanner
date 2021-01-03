// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of purpleteam.

// purpleteam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// purpleteam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with purpleteam. If not, see <https://www.gnu.org/licenses/>.

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
  path: '/run-job',
  handler: async (request, respToolkit) => { // eslint-disable-line no-unused-vars
    const { model } = request.server.app;
    const { payload: testJob } = request;

    return respToolkit.response(await model.runJob(testJob));
  }
}];


// Maintain default set of cucumber features and steps, to run depending on what build user wants as specified in passed config.


// Return low level report for orchestrator to compile with other testers and format.
