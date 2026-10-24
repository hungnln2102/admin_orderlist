/**
    * run_import_test.js
    * Script tự động chuẩn bị database mydtbmav_v1_restore, restore dump V1, tạo mydtbmav_v2_import và chạy importV1OperationalDataToV2Sandbox.js
    */
   require('dotenv').config();
   const { execSync } = require('child_process');
   const { Pool } = require('pg');
   const path = require('path');
   const fs = require('fs');
   
   const DB_HOST = process.env.DB_HOST || 'localhost';
   const DB_PORT = process.env.DB_PORT || 5432;
   const DB_USER = process.env.DB_USER || 'admin';
   const DB_PASS = process.env.DB_PASS || 'ZAQ!xsw21122';
   
   const DUMP_FILE = 'c:/Users/Laptop/Desktop/Personal/Admin_Orderlist/db-backup-2026-10-06T17-01-00-174Z.dump';
   
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
   
   async function main() {
     console.log('==================================================');
     console.log('🚀 BẮT ĐẦU CHUẨN BỊ RESTORE V1 & IMPORT V2 SANDBOX');
     console.log('==================================================');
     console.log(`Đường dẫn dump: ${DUMP_FILE}`);
   
     if (!fs.existsSync(DUMP_FILE)) {
       console.error(`❌ Không tìm thấy file dump tại: ${DUMP_FILE}`);
       process.exit(1);
     }
   
     const pool = new Pool({
       host: DB_HOST,
       port: DB_PORT,
       user: DB_USER,
       password: DB_PASS,
       database: 'postgres',
     });
   
     const env = { ...process.env, PGPASSWORD: DB_PASS };
   
     try {
       console.log('\n--- Bước 1: Tạo database mydtbmav_v1_restore & mydtbmav_v2_import ---');
       await pool.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('mydtbmav_v1_restore', 'mydtbmav_v2_import') AND pid <> pg_backend_pid();`);
       await pool.query(`DROP DATABASE IF EXISTS "mydtbmav_v1_restore";`);
       await pool.query(`DROP DATABASE IF EXISTS "mydtbmav_v2_import";`);
       await pool.query(`CREATE DATABASE "mydtbmav_v1_restore";`);
       await pool.query(`CREATE DATABASE "mydtbmav_v2_import";`);
       console.log('✅ Đã tạo sạch 2 database.');
   
       console.log('\n--- Bước 2: Restore V1 backup vào mydtbmav_v1_restore ---');
       const restoreCmd = `${PG_RESTORE_BIN} --host=${DB_HOST} --port=${DB_PORT} --username=${DB_USER} --dbname=mydtbmav_v1_restore --no-owner --no-acl "${DUMP_FILE}"`;
       console.log(`Đang chạy: ${restoreCmd}`);
       try {
         execSync(restoreCmd, { stdio: 'inherit', env });
         console.log('✅ Restore V1 backup thành công.');
       } catch (err) {
         console.warn('⚠️ pg_restore có warning (tiếp tục chạy import):', err.message);
       }
   
       console.log('\n--- Bước 3: Chạy script import V1 sang V2 Sandbox ---');
       const importScript = path.resolve(__dirname, '../scripts/importV1OperationalDataToV2Sandbox.js');
       const importCmd = `node -r module-alias/register "${importScript}" --reset-target --apply`;
       
       const importEnv = {
         ...env,
         V1_DATABASE_URL: `postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/mydtbmav_v1_restore`,
         V2_IMPORT_DATABASE_URL: `postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/mydtbmav_v2_import`,
         ALLOW_UNSAFE_TARGET: '1',
       };
   
       console.log(`Đang chạy: ${importCmd}`);
       execSync(importCmd, { stdio: 'inherit', env: importEnv });
       console.log('🎉 IMPORT DỮ LIỆU V1 VÀO V2 SANDBOX THÀNH CÔNG RỰC RỠ!');
     } catch (err) {
       console.error('❌ Lỗi quá trình import:', err);
       process.exit(1);
     } finally {
       await pool.end();
     }
   }
   
   main();
   
