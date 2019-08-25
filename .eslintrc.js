module.exports = {
  env: {
    browser: true,
    es6: true,
    jest: true,
    node: true,
  },
  extends: ['airbnb'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks'],
  rules: {
    'arrow-parens': ['error', 'as-needed'],
    'brace-style': ['error', 'stroustrup'],
    'object-curly-newline': ['error', { multiline: true, minProperties: 4 }],
    'import/no-extraneous-dependencies': [
      'error',
      {
        peerDependencies: true,
        optionalDependencies: false,
        devDependencies: ['**/*.spec.js', '**/*.test.js'],
      },
    ],
    'react/prop-types': ['off'],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/jsx-filename-extension': ['error', { extensions: ['.js', '.jsx'] }],
  },
};
