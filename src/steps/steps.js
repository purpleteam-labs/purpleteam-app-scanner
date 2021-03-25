// features/support/steps.js
const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

// Cucumber expects a non arrow function in order for the this to refer to the world.
/* eslint-disable func-names */
Given('a variable set to {int}', function (number) {
  this.setTo(number);
});

When('I increment the variable by {int}', function (number) {
  this.incrementBy(number);
});

Then('the variable should contain {int}', function (number) {
  assert(this.variable === number);
});
/* eslint-enable func-names */
