module.exports = {
  env: {
    'es6': true,
    'node': true,
  },
  extends: 'eslint:recommended',
  globals: {
    'Atomics': 'readonly',
    'SharedArrayBuffer': 'readonly'
  },
  parser: 'babel-eslint',
  parserOptions: {
    'ecmaVersion': 2018,
    'sourceType': 'module'
  },
  plugins: [],
  rules: {
    'require-atomic-updates': 'off',
    'indent': ['error', 2, {
      "ignoredNodes": ["TemplateLiteral"],
      "SwitchCase": 1,
      "flatTernaryExpressions": true,
    }],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'brace-style': ['error', 'stroustrup']
  }
};
