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

const cuc = require('./app.cuc');
const emissary = require('./app.emissary');

// Get help with cucumber cli:
// node ./node_modules/.bin/cucumber-js --help

// Debug cucumber cli without actually running the tests (--dry-run). --dry-run to check that all glue code exists: https://github.com/cucumber/cucumber-jvm/issues/907
// node --inspect-brk ./node_modules/.bin/cucumber-js --dry-run src/features --require src/steps --tags "not @simple_math"

module.exports = { cuc, emissary };
