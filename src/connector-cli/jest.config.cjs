/** @type {import('jest').Config} */
module.exports = {
  roots: ['<rootDir>/test'],
  testMatch: ['**/?(*.)+(spec|test).+(ts|js)'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@cli/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/core/types/gen-types.ts',
    '!src/commands/new/templates/**',
    '!src/reload.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text', 'json', 'json-summary'],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        suiteName: 'connector-cli',
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
      },
    ],
  ],
  testTimeout: 30000,
};
