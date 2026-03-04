// apps/api/jest.config.js
/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        // Allow decorators and other NestJS-specific TS features
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
      },
    }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  // Separate integration tests so unit tests run fast
  testPathIgnorePatterns: ['.*\\.integration\\.spec\\.ts$'],
};
