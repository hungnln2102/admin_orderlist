const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("module-alias/register");
const { resolvePgDumpExecutable } = require("../../src/scheduler/tasks/autoBackupDatabaseTask");

test("resolvePgDumpExecutable resolves pg_dump or null when PG_DUMP_PATH is unset", () => {
  const originalEnv = process.env.PG_DUMP_PATH;
  try {
    delete process.env.PG_DUMP_PATH;
    const result = resolvePgDumpExecutable();
    assert.ok(result === null || typeof result === "string");
  } finally {
    if (originalEnv !== undefined) {
      process.env.PG_DUMP_PATH = originalEnv;
    } else {
      delete process.env.PG_DUMP_PATH;
    }
  }
});

test("resolvePgDumpExecutable throws when PG_DUMP_PATH points to non-existent file", () => {
  const originalEnv = process.env.PG_DUMP_PATH;
  try {
    process.env.PG_DUMP_PATH = "/path/to/non_existent_pg_dump";
    assert.throws(() => resolvePgDumpExecutable(), /PG_DUMP_PATH trỏ tới file không tồn tại/);
  } finally {
    if (originalEnv !== undefined) {
      process.env.PG_DUMP_PATH = originalEnv;
    } else {
      delete process.env.PG_DUMP_PATH;
    }
  }
});

test("scheduler registers auto_backup_database handler", () => {
  const schedulerCode = fs.readFileSync(
    path.resolve(__dirname, "../../src/scheduler/index.js"),
    "utf8"
  );
  assert.ok(schedulerCode.includes("auto_backup_database:"));
  assert.ok(schedulerCode.includes("autoBackupDatabaseTask"));
});
