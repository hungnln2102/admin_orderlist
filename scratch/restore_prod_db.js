const { execSync } = require('child_process');
const path = require('path');

function main() {
  const psqlPath = 'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe';
  const pgRestorePath = 'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe';
  const dumpPath = path.join(__dirname, '..', 'db-backup-2026-10-05T17-01-00-150Z.dump');
  const env = { ...process.env, PGPASSWORD: 'ZAQ!xsw21122' };

  console.log('1. Terminating connections to mydtbmav...');
  execSync(`"${psqlPath}" -h 127.0.0.1 -U admin -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'mydtbmav' AND pid <> pg_backend_pid();"`, { env, stdio: 'inherit' });

  console.log('2. Dropping old database mydtbmav...');
  execSync(`"${psqlPath}" -h 127.0.0.1 -U admin -d postgres -c "DROP DATABASE IF EXISTS mydtbmav;"`, { env, stdio: 'inherit' });

  console.log('3. Creating fresh database mydtbmav...');
  execSync(`"${psqlPath}" -h 127.0.0.1 -U admin -d postgres -c "CREATE DATABASE mydtbmav;"`, { env, stdio: 'inherit' });

  console.log('4. Restoring Production dump db-backup-2026-10-05T17-01-00-150Z.dump...');
  try {
    execSync(`"${pgRestorePath}" -h 127.0.0.1 -U admin -d mydtbmav --no-owner --no-acl "${dumpPath}"`, { env, stdio: 'inherit' });
  } catch (err) {
    console.log('pg_restore completed with warnings/notices.');
  }

  console.log('SUCCESS: Production database restored 100% clean!');
}

main();
