/**
 * Full V1 Restore & V2 ETL Automation Script (Direct Restore into V2 DB + Migrations + ETL)
 */
require('dotenv').config();
const { execSync } = require('child_process');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const TARGET_DB = process.env.DB_NAME;

if (!DB_HOST || !DB_USER || !DB_PASS || !TARGET_DB) {
  throw new Error('DB_HOST, DB_USER, DB_PASS and DB_NAME are required.');
}

// Locate dump file
const possibleDumpPaths = [
  path.resolve(__dirname, '../../../../db-backup-2026-10-06T17-01-00-174Z.dump'),
  path.resolve(__dirname, '../../../db-backup-2026-10-06T17-01-00-174Z.dump'),
  path.resolve(__dirname, '../../db-backup-2026-10-06T17-01-00-174Z.dump'),
];

let DUMP_FILE = null;
for (const p of possibleDumpPaths) {
  if (fs.existsSync(p)) {
    DUMP_FILE = p;
    break;
  }
}

// Locate pg_restore
const possiblePgRestore = [
  'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_restore.exe',
  'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe',
  'pg_restore',
];

let PG_RESTORE_BIN = 'pg_restore';
for (const bin of possiblePgRestore) {
  if (bin === 'pg_restore' || fs.existsSync(bin)) {
    PG_RESTORE_BIN = `"${bin}"`;
    break;
  }
}

async function run() {
  console.log('==================================================');
  console.log('🚀 STARTING DIRECT V1 RESTORE, V2 MIGRATIONS & ETL');
  console.log('==================================================');
  console.log(`Dump file: ${DUMP_FILE}`);

  if (!DUMP_FILE || !fs.existsSync(DUMP_FILE)) {
    console.error('❌ Error: Backup dump file not found!');
    process.exit(1);
  }

  const adminPool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: 'postgres',
  });

  const env = { ...process.env, PGPASSWORD: DB_PASS };

  try {
    // 1. Drop & Recreate Target V2 Database
    console.log('\n--- Step 1: Recreating V2 Database ---');
    await adminPool.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid();`, [TARGET_DB]);
    await adminPool.query(`DROP DATABASE IF EXISTS "${TARGET_DB}";`);
    await adminPool.query(`CREATE DATABASE "${TARGET_DB}";`);
    console.log(`✅ Database ${TARGET_DB} created fresh.`);

    // 2. Restore V1 Dump Directly into V2 Database
    console.log('\n--- Step 2: Restoring V1 Backup into V2 Database ---');
    const restoreCmd = `${PG_RESTORE_BIN} --host=${DB_HOST} --port=${DB_PORT} --username=${DB_USER} --dbname=${TARGET_DB} --no-owner --no-acl "${DUMP_FILE}"`;
    
    console.log(`Executing: ${restoreCmd}`);
    try {
      execSync(restoreCmd, { stdio: 'inherit', env });
      console.log('✅ V1 dump restored into V2 database successfully.');
    } catch (err) {
      console.warn('⚠️ pg_restore warnings/errors encountered (continuing to migrations & ETL):', err.message);
    }

    // 3. Run V2 Knex Migrations (adds V2 tables, indexes, and missing columns via ALTER TABLE)
    console.log('\n--- Step 3: Running V2 Knex Migrations ---');
    execSync('npx knex migrate:latest', { cwd: path.resolve(__dirname, '..'), stdio: 'inherit', env });
    console.log('✅ V2 migrations completed successfully.');

  } catch (err) {
    console.error('❌ Restore & Migration Error:', err);
    process.exit(1);
  } finally {
    await adminPool.end();
  }

  // 4. Run V1 to V2 ETL Migration Script
  console.log('\n--- Step 4: Running V1 to V2 ETL Data Sync ---');
  try {
    const etlScriptPath = path.resolve(__dirname, 'migrateSystemV1ToV2.js');
    console.log(`Executing: node ${etlScriptPath}`);
    execSync(`node "${etlScriptPath}"`, { stdio: 'inherit', env });
    console.log('✅ V1 to V2 ETL Data Sync completed successfully.');
  } catch (err) {
    console.error('❌ ETL Data Sync Error:', err);
    process.exit(1);
  }

  console.log('\n==================================================');
  console.log('🎉 FULL RESTORE, MIGRATION & ETL COMPLETED!');
  console.log('==================================================');
  process.exit(0);
}

run();
