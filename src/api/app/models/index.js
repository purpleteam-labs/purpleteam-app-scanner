const parallel = require('./app.parallel');
const sequential = require('./app.sequential');
const publisher = require('./app.publisher');

// Get help with cucumber cli:
// node ./node_modules/.bin/cucumber-js --help

// Debug cucumber cli without actually running the tests (--dry-run). --dry-run to check that all glue code exists: https://github.com/cucumber/cucumber-jvm/issues/907
// node --inspect-brk ./node_modules/.bin/cucumber-js --dry-run src/features --require src/steps --tags "not @simple_math"

module.exports = { parallel, sequential, publisher };
