// features/support/steps.js
const { Given, When, Then } = require('cucumber');
const { expect } = require('code');

Given('a variable set to {int}', (number) => {
  this.setTo(number);
});

When('I increment the variable by {int}', (number) => {
  this.incrementBy(number);
});

Then('the variable should contain {int}', (number) => {
  expect(this.variable).to.equal(number);
});
