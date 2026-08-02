require('module-alias/register');
const { db } = require('@/db');

async function run() {
  try {
    const users = await db('admin.users').select('username', 'passwordhash', 'role');
    console.log("Users in DB:");
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error querying users:", err.message);
  } finally {
    process.exit(0);
  }
}

run();
