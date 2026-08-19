require("module-alias/register");
process.env.NODE_ENV = "test";
const { db } = require("@/db");
async function run() {
  const result = await db("finance.users").select("username", "passwordhash", "role");
  console.log("Users in finance.users:", result);
  process.exit(0);
}
run();
