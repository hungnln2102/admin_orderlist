const { db } = require("../../src/db");

// Tear down database connections after all tests finish
afterAll(async () => {
  await db.destroy();
});
