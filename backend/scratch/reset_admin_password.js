require('module-alias/register');
const { db } = require('@/db');
const bcrypt = require('bcryptjs');

async function run() {
  try {
    const password = "admin123456";
    const hash = await bcrypt.hash(password, 10);
    
    // Check if admin user exists
    const adminUser = await db('admin.users').where({ username: 'admin' }).first();
    if (adminUser) {
      await db('admin.users').where({ username: 'admin' }).update({ passwordhash: hash });
      console.log("Successfully reset password for 'admin' to 'admin123456'");
    } else {
      await db('admin.users').insert({
        username: 'admin',
        passwordhash: hash,
        role: 'Admin'
      });
      console.log("Successfully created 'admin' user with password 'admin123456'");
    }
  } catch (err) {
    console.error("Error resetting admin password:", err.message);
  } finally {
    process.exit(0);
  }
}

run();
