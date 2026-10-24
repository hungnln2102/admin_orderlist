/**
    * run_import_main.js
    * Script import trực tiếp dữ liệu V1 vào database chính `mydtbmav` trên local.
    */
   require('dotenv').config();
   const { execSync } = require('child_process');
   const path = require('path');
   
   const DB_HOST = process.env.DB_HOST || 'localhost';
   const DB_PORT = process.env.DB_PORT || 5432;
   const DB_USER = process.env.DB_USER || 'admin';
   const DB_PASS = process.env.DB_PASS || 'ZAQ!xsw21122';
   
   async function main() {
     console.log('==================================================');
     console.log('🚀 IMPORT TRỰC TIẾP DỮ LIỆU V1 VÀO DATABASE CHÍNH (mydtbmav)');
     console.log('==================================================');
   
     const env = { ...process.env, PGPASSWORD: DB_PASS };
   
     const importScript = path.resolve(__dirname, '../scripts/importV1OperationalDataToV2Sandbox.js');
     const importCmd = `node -r module-alias/register "${importScript}" --reset-target --apply`;
     
     const importEnv = {
       ...env,
       V1_DATABASE_URL: `postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/mydtbmav_v1_restore`,
       V2_IMPORT_DATABASE_URL: `postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/mydtbmav`,
       ALLOW_UNSAFE_TARGET: '1',
     };
   
     console.log(`Đang chạy: ${importCmd}`);
     execSync(importCmd, { stdio: 'inherit', env: importEnv });
     console.log('🎉 IMPORT TRỰC TIẾP VÀO DATABASE CHÍNH mydtbmav THÀNH CÔNG RỰC RỠ!');
   }
   
   main();
   
