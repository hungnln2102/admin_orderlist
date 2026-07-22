const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Client } = require('pg');

const DUMP_FILE = fs.existsSync(path.join(__dirname, '..', 'db-backup-2026-07-18T17-01-00-242Z.dump'))
  ? path.join(__dirname, '..', 'db-backup-2026-07-18T17-01-00-242Z.dump')
  : path.join(__dirname, '..', '..', 'db-backup-2026-07-18T17-01-00-242Z.dump');
const ENV_FILE = path.join(__dirname, '..', '.env');

console.log('=== Checking Local PostgreSQL ===');

// Check possible pg_restore paths
const possiblePgRestorePaths = [
  'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_restore.exe',
  'pg_restore'
];

let pgRestorePath = null;
for (const p of possiblePgRestorePaths) {
  try {
    if (p === 'pg_restore') {
      execSync('pg_restore --version', { stdio: 'ignore' });
      pgRestorePath = 'pg_restore';
      break;
    } else if (fs.existsSync(p)) {
      pgRestorePath = `"${p}"`;
      break;
    }
  } catch (e) {}
}

if (!pgRestorePath) {
  console.error('❌ không tìm thấy pg_restore. Vui lòng hoàn tất cài đặt PostgreSQL trên máy.');
  process.exit(1);
}

console.log(`✅ Tìm thấy pg_restore: ${pgRestorePath}`);

async function main() {
  const superuserClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: process.env.PGPASSWORD || 'ZAQ!xsw21122',
    database: 'postgres'
  });

  try {
    await superuserClient.connect();
    console.log('✅ Đã kết nối tới PostgreSQL (localhost:5432) với user postgres');

    // Create user admin if not exists
    console.log('Creating user admin...');
    await superuserClient.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'admin') THEN
          CREATE ROLE admin WITH LOGIN PASSWORD 'ZAQ!xsw21122' SUPERUSER;
        ELSE
          ALTER ROLE admin WITH PASSWORD 'ZAQ!xsw21122' SUPERUSER;
        END IF;
      END
      $$;
    `);

    // Create database mydtbmav if not exists
    console.log('Creating database mydtbmav...');
    const dbRes = await superuserClient.query("SELECT 1 FROM pg_database WHERE datname = 'mydtbmav'");
    if (dbRes.rowCount === 0) {
      await superuserClient.query('CREATE DATABASE mydtbmav OWNER admin');
    }
    await superuserClient.end();

    // Run pg_restore
    console.log(`Restore database từ file: ${DUMP_FILE}...`);
    const restoreCmd = `${pgRestorePath} --host=localhost --port=5432 --username=admin --dbname=mydtbmav --no-owner --clean --if-exists "${DUMP_FILE}"`;
    
    execSync(restoreCmd, {
      env: { ...process.env, PGPASSWORD: 'ZAQ!xsw21122' },
      stdio: 'inherit'
    });

    console.log('✅ Restore database thành công!');

    // Update .env file
    if (fs.existsSync(ENV_FILE)) {
      let envContent = fs.readFileSync(ENV_FILE, 'utf8');
      envContent = envContent.replace(
        /^DATABASE_URL=.*$/m,
        'DATABASE_URL=postgresql://admin:ZAQ!xsw21122@localhost:5432/mydtbmav'
      );
      fs.writeFileSync(ENV_FILE, envContent, 'utf8');
      console.log('✅ Đã cập nhật DATABASE_URL trong file backend/.env thành localhost');
    }

  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  }
}

main();
