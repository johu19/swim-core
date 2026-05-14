const path = require('node:path');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts', 'cjs'],
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': path.join(__dirname, 'ts-jest-transformer.cjs'),
  },
};
