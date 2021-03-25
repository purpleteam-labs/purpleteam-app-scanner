module.exports = {
  // https://github.com/avajs/eslint-plugin-ava
  extends: 'plugin:ava/recommended',
  rules: {
    // __set__ and __get__ are used in the rewire package
    'no-underscore-dangle': ['error', { allow: ['__set__', '__get__'] }]
  }
};
