import globals from 'globals';
import pluginJs from '@eslint/js';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  pluginJs.configs.recommended,
  {
    plugins: { 
      import: importPlugin 
    },
    rules: {
      'no-console': 'off',
      'no-underscore-dangle': ['error', {
        allow: ['__filename', '__dirname'],
      }],
      'import/extensions': ['error', 'ignorePackages', {
        js: 'always',
      }],
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-extraneous-dependencies': 'off',
    },
  },
];
