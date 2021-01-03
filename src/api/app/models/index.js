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

const parallel = require('./app.parallel');
const sequential = require('./app.sequential');
const publisher = require('./app.publisher');

// Get help with cucumber cli:
// node ./node_modules/.bin/cucumber-js --help

// Debug cucumber cli without actually running the tests (--dry-run). --dry-run to check that all glue code exists: https://github.com/cucumber/cucumber-jvm/issues/907
// node --inspect-brk ./node_modules/.bin/cucumber-js --dry-run src/features --require src/steps --tags "not @simple_math"

module.exports = { parallel, sequential, publisher };
