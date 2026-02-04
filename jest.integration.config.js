module.exports = {
    displayName: 'Integration Tests',
    testMatch: ['**/integration-test.ts'],
    testEnvironment: 'node',
    preset: 'ts-jest',
    setupFilesAfterEnv: ['<rootDir>/test-setup.integration.ts'],
    testTimeout: 60000, // 60 seconds for integration tests
    maxWorkers: 1, // Run integration tests sequentially
    verbose: true,
    collectCoverageFrom: [
        'apps/**/src/**/*.ts',
        '!apps/**/src/**/*.spec.ts',
        '!apps/**/src/**/*.test.ts',
        '!apps/**/src/main.ts',
    ],
    coverageDirectory: 'coverage/integration',
    coverageReporters: ['text', 'lcov', 'html'],
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/packages/$1',
        '^@apps/(.*)$': '<rootDir>/apps/$1',
    },
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testRegex: 'integration-test\\.ts$',
    collectCoverage: false, // Disable for faster execution
};