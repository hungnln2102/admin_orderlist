/**
 * Jest Configuration for Backend Tests
 *
 * Hai project:
 *   - unit:        pure-function tests, không cần DB, chạy song song.
 *   - integration: kết nối DB thật, chạy tuần tự (--runInBand).
 *
 * Chạy riêng:
 *   npm run test:unit
 *   npm run test:integration
 *
 * Chạy tất cả:
 *   npm test
 *
 * @type {import('jest').Config}
 */
const sharedConfig = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^webhook-sepay/(.*)$": "<rootDir>/webhook/sepay/$1",
  },
  testTimeout: 30000,
  verbose: true,
};

module.exports = {
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/**/index.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],

  projects: [
    {
      ...sharedConfig,
      displayName: "unit",
      roots: ["<rootDir>/tests/jest/unit"],
      testMatch: ["**/*.test.js"],
    },
    {
      ...sharedConfig,
      displayName: "integration",
      roots: ["<rootDir>/tests/jest/integration"],
      testMatch: ["**/*.test.js"],
      setupFilesAfterEnv: ["<rootDir>/tests/jest/setup.js"],
    },
  ],
};
