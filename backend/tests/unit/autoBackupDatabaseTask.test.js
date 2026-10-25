const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");
const { resolvePgDumpExecutable } = require("../../src/scheduler/tasks/autoBackupDatabaseTask");

test("resolvePgDumpExecutable resolves pg_dump without uncaught exceptions", () => {
  const result = resolvePgDumpExecutable();
  assert.ok(result === null || typeof result === "string");
});

test("scheduler registers auto_backup_database handler", () => {
  // Đọc nội dung scheduler/index.js để kiểm tra tính hiện diện của handler
  const schedulerCode = require("fs").readFileSync(
    require("path").resolve(__dirname, "../../src/scheduler/index.js"),
    "utf8"
  );
  assert.ok(schedulerCode.includes("auto_backup_database:"));
  assert.ok(schedulerCode.includes("autoBackupDatabaseTask"));
});
