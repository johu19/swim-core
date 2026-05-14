const path = require('node:path');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts', 'cjs'],
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': path.join(__dirname, 'test', 'ts-jest-transformer.cjs'),
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
};
