const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const integrationDirectory = path.resolve(__dirname, "integration");
const requestedTests = process.argv.slice(2);
const testFiles = requestedTests.length
  ? requestedTests.map((file) => path.resolve(process.cwd(), file))
  : fs.readdirSync(integrationDirectory)
    .filter((file) => file.endsWith(".test.js"))
    .map((file) => path.join(integrationDirectory, file));

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is required. Refusing to run integration tests against the normal DATABASE_URL.");
}

const testDatabaseUrl = new URL(process.env.TEST_DATABASE_URL);
if (!testDatabaseUrl.pathname.toLowerCase().includes("test")) {
  throw new Error("TEST_DATABASE_URL must point to a database whose name contains 'test'.");
}

for (const testFile of testFiles) {
  const relativePath = path.relative(integrationDirectory, testFile);
  if (relativePath.startsWith("..") || path.extname(testFile) !== ".js" || !fs.existsSync(testFile)) {
    throw new Error(`Invalid integration test path: ${testFile}`);
  }

  const result = spawnSync(process.execPath, [testFile], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: "inherit",
  });

  if (result.status !== 0) process.exit(result.status || 1);
}
