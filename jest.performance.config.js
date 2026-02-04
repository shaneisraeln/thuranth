module.exports = {
    displayName: 'Performance Tests',
    testMatch: ['**/performance-test.ts'],
    testEnvironment: 'node',
    preset: 'ts-jest',
    setupFilesAfterEnv: ['<rootDir>/test-setup.performance.ts'],
    testTimeout: 300000, // 5 minutes for performance tests
    maxWorkers: 1, // Run performance tests sequentially
    verbose: true,
    collectCoverageFrom: [
        'apps/**/src/**/*.ts',
        '!apps/**/src/**/*.spec.ts',
        '!apps/**/src/**/*.test.ts',
        '!apps/**/src/main.ts',
    ],
    coverageDirectory: 'coverage/performance',
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
    testRegex: 'performance-test\\.ts$',
    collectCoverage: false, // Disable for performance testing
    reporters: [
        'default',
        ['jest-html-reporters', {
            publicPath: './performance-reports',
            filename: 'performance-report.html',
            expand: true,
        }],
    ],
};