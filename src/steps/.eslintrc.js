module.exports = {
  rules: {
    // The Cucumber world is exposed as 'this' to hooks and steps: https://github.com/cucumber/cucumber-js/blob/52d0e328729f1f9d2ae05d72426a3377a1aae9cc/docs/faq.md
    'func-names': ['error', 'never']
  }
};
