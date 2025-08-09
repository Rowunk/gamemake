/* eslint-env node */
module.exports = {
  root: true,
  env: {
    es2022: true,
    browser: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['jsdoc'],
  extends: ['eslint:recommended', 'plugin:jsdoc/recommended'],
  rules: {
    // style/safety
    'no-var': 'error',
    'no-implicit-globals': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'smart'],
    curly: ['error', 'all'],

    // project rules mapping
    'jsdoc/require-jsdoc': [
      'error',
      {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
        },
        contexts: ['ExportNamedDeclaration', 'ExportDefaultDeclaration'],
      },
    ],
    'jsdoc/require-param-type': 'error',
    'jsdoc/require-returns-type': 'error',
    'jsdoc/check-types': 'error',
    'jsdoc/require-throws': 'off', // we’ll document throws where relevant
  },
  settings: {
    jsdoc: {
      mode: 'typescript',
    },
  },
  overrides: [
    // tests run in Node
    {
      files: ['tests/**/*.js'],
      env: { node: true, browser: false },
    },
    // public demos may access browser-only globals
    {
      files: ['public/**/*.js'],
      env: { browser: true, node: false },
    },
  ],
};
