module.exports = {
  extends: 'airbnb-base',
  rules: {
    'comma-dangle': ['error', 'never'],

    // specify the maximum length of a line in your program
    // http://eslint.org/docs/rules/max-len
    'max-len': ['error', 200, 2, {
      ignoreUrls: true,
      ignoreComments: false,
      ignoreRegExpLiterals: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true
    }],
    // enforce consistent line breaks inside function parentheses
    // https://eslint.org/docs/rules/function-paren-newline
    'function-paren-newline': ['error', 'multiline'],
    'import/no-unresolved': ['error', { commonjs: true }],
    'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    'object-curly-newline': ['error', { multiline: true }],
    'no-multiple-empty-lines': ['error', { max: 2, maxBOF: 0, maxEOF: 1 }],
    'newline-per-chained-call': 'off',
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }]
  },
  env: { node: true },
  parserOptions: { ecmaVersion: 2021 },
  parser: 'babel-eslint', // required for private class members as eslint only supports ECMA Stage 4, will be able to remove in the future
  settings: {
    'import/resolver': {
      node: {
        paths: [
          `${process.cwd()}`
        ]
      }
    }
  }
};
