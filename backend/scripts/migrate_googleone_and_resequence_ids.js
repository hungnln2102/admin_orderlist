const { db, withTransaction } = require('@/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('=== BẮT ĐẦU MIGRATION GOM GOOGLEONE & SẮP XẾP LẠI TOÀN BỘ ID KHO HÀNG ===\n');

  let account76NewId = null;

  await withTransaction(async (trx) => {
    // -------------------------------------------------------------
    // BƯỚC 1: Drop tạm thời 6 Foreign Keys nội bộ kho hàng
    // -------------------------------------------------------------
    console.log('[1/7] Tạm thời gỡ bỏ các ràng buộc khóa ngoại nội bộ...');
    await trx.raw(`
      ALTER TABLE warehouse.accounts DROP CONSTRAINT IF EXISTS accounts_product_name_id_fkey;
      ALTER TABLE warehouse.account_slots DROP CONSTRAINT IF EXISTS account_slots_account_id_fkey;
      ALTER TABLE warehouse.account_slots DROP CONSTRAINT IF EXISTS account_slots_name_id_fkey;
      ALTER TABLE warehouse.package_products DROP CONSTRAINT IF EXISTS package_products_product_name_id_fkey;
      ALTER TABLE warehouse.package_products DROP CONSTRAINT IF EXISTS package_products_account_id_fkey;
      ALTER TABLE warehouse.package_products DROP CONSTRAINT IF EXISTS package_products_storage_account_id_fkey;
    `);

    // -------------------------------------------------------------
    // BƯỚC 2: Gom 7 dịch vụ Google/Gemini về gói gốc GoogleOne (id: 15)
    // -------------------------------------------------------------
    console.log('[2/7] Gom các dịch vụ Google & Gemini về GoogleOne (id: 15) và gán tag...');
    // Tag 100gb: Google One 100gb (id: 3)
    const res100 = await trx.raw(`
      UPDATE warehouse.account_slots 
      SET name_id = 15, variant_tag = '100gb', updated_at = NOW() 
      WHERE name_id = 3;
    `);
    console.log(`  - Chuyển Google One 100gb -> GoogleOne [100gb]: ${res100.rowCount} slots`);

    // Tag 2000gb: Google One 2000Gb (8), Google Drive 2000Gb (9), Google One 2Tb (10)
    const res2000 = await trx.raw(`
      UPDATE warehouse.account_slots 
      SET name_id = 15, variant_tag = '2000gb', updated_at = NOW() 
      WHERE name_id IN (8, 9, 10);
    `);
    console.log(`  - Chuyển Google 2000Gb / 2Tb -> GoogleOne [2000gb]: ${res2000.rowCount} slots`);

    // Tag 5000Gb: Google One 5Tb (11)
    const res5000 = await trx.raw(`
      UPDATE warehouse.account_slots 
      SET name_id = 15, variant_tag = '5000Gb', updated_at = NOW() 
      WHERE name_id = 11;
    `);
    console.log(`  - Chuyển Google One 5Tb -> GoogleOne [5000Gb]: ${res5000.rowCount} slots`);

    // Tag Gemini: Gemini Pro (7), Gemini (16)
    const resGemini = await trx.raw(`
      UPDATE warehouse.account_slots 
      SET name_id = 15, variant_tag = 'Gemini', updated_at = NOW() 
      WHERE name_id IN (7, 16);
    `);
    console.log(`  - Chuyển Gemini / Gemini Pro -> GoogleOne [Gemini]: ${resGemini.rowCount} slots`);

    // Chuyển các gói package Gemini -> GoogleOne
    const resPkg = await trx.raw(`
      UPDATE warehouse.package_products 
      SET product_name_id = 15 
      WHERE product_name_id = 16;
    `);
    console.log(`  - Chuyển package Gemini sang GoogleOne: ${resPkg.rowCount} packages`);

    // Xóa 7 dịch vụ phân mảnh cũ
    const resDel = await trx.raw(`
      DELETE FROM warehouse.product_names 
      WHERE id IN (3, 7, 8, 9, 10, 11, 16);
    `);
    console.log(`  - Đã xóa 7 dịch vụ phân mảnh cũ: ${resDel.rowCount} rows`);

    // -------------------------------------------------------------
    // BƯỚC 3: Sắp xếp lại ID cho warehouse.product_names (10 dịch vụ)
    // -------------------------------------------------------------
    console.log('[3/7] Sắp xếp lại ID cho warehouse.product_names...');
    const prodList = (await trx.raw(`SELECT id, name FROM warehouse.product_names ORDER BY id ASC`)).rows;
    console.log(`  - Số lượng dịch vụ hiện tại: ${prodList.length}`);

    // Để tránh trùng Primary Key trong quá trình đổi, đầu tiên chuyển ID sang số âm tạm thời
    for (let i = 0; i < prodList.length; i++) {
      const oldId = prodList[i].id;
      const newId = i + 1;
      const tempId = -(newId);

      await trx.raw(`UPDATE warehouse.product_names SET id = ? WHERE id = ?`, [tempId, oldId]);
      await trx.raw(`UPDATE warehouse.account_slots SET name_id = ? WHERE name_id = ?`, [tempId, oldId]);
      await trx.raw(`UPDATE warehouse.package_products SET product_name_id = ? WHERE product_name_id = ?`, [tempId, oldId]);
      await trx.raw(`UPDATE warehouse.accounts SET product_name_id = ? WHERE product_name_id = ?`, [tempId, oldId]);
    }

    // Đổi từ số âm sang số dương mới liền mạch (1..N)
    for (let i = 0; i < prodList.length; i++) {
      const newId = i + 1;
      const tempId = -(newId);

      await trx.raw(`UPDATE warehouse.product_names SET id = ? WHERE id = ?`, [newId, tempId]);
      await trx.raw(`UPDATE warehouse.account_slots SET name_id = ? WHERE name_id = ?`, [newId, tempId]);
      await trx.raw(`UPDATE warehouse.package_products SET product_name_id = ? WHERE product_name_id = ?`, [newId, tempId]);
      await trx.raw(`UPDATE warehouse.accounts SET product_name_id = ? WHERE product_name_id = ?`, [newId, tempId]);
      console.log(`    * Dịch vụ "${prodList[i].name}": ID ${prodList[i].id} -> ${newId}`);
    }

    await trx.raw(`SELECT setval('warehouse.product_names_id_seq', ?);`, [prodList.length]);

    // -------------------------------------------------------------
    // BƯỚC 4: Sắp xếp lại ID cho warehouse.accounts (63 tài khoản)
    // -------------------------------------------------------------
    console.log('[4/7] Sắp xếp lại ID cho warehouse.accounts...');
    const accList = (await trx.raw(`SELECT id, account_username FROM warehouse.accounts ORDER BY id ASC`)).rows;
    console.log(`  - Số lượng tài khoản hiện tại: ${accList.length}`);

    // Chuyển sang số âm tạm thời
    for (let i = 0; i < accList.length; i++) {
      const oldId = accList[i].id;
      const newId = i + 1;
      const tempId = -(newId);

      if (String(oldId) === '76') {
        account76NewId = newId;
      }

      await trx.raw(`UPDATE warehouse.accounts SET id = ? WHERE id = ?`, [tempId, oldId]);
      await trx.raw(`UPDATE warehouse.account_slots SET account_id = ? WHERE account_id = ?`, [tempId, oldId]);
      await trx.raw(`UPDATE warehouse.package_products SET account_id = ? WHERE account_id = ?`, [tempId, oldId]);
      await trx.raw(`UPDATE warehouse.package_products SET storage_account_id = ? WHERE storage_account_id = ?`, [tempId, oldId]);
    }

    // Đổi sang số dương mới
    for (let i = 0; i < accList.length; i++) {
      const newId = i + 1;
      const tempId = -(newId);

      await trx.raw(`UPDATE warehouse.accounts SET id = ? WHERE id = ?`, [newId, tempId]);
      await trx.raw(`UPDATE warehouse.account_slots SET account_id = ? WHERE account_id = ?`, [newId, tempId]);
      await trx.raw(`UPDATE warehouse.package_products SET account_id = ? WHERE account_id = ?`, [newId, tempId]);
      await trx.raw(`UPDATE warehouse.package_products SET storage_account_id = ? WHERE storage_account_id = ?`, [newId, tempId]);
    }

    await trx.raw(`SELECT setval('warehouse.accounts_id_seq', ?);`, [accList.length]);
    console.log(`  - Đã đổi 63 tài khoản thành ID 1..63. Tài khoản cũ 76 -> ID mới: ${account76NewId}`);

    // -------------------------------------------------------------
    // BƯỚC 5: Sắp xếp lại ID cho warehouse.account_slots (67 slots)
    // -------------------------------------------------------------
    console.log('[5/7] Sắp xếp lại ID cho warehouse.account_slots...');
    const slotList = (await trx.raw(`SELECT id FROM warehouse.account_slots ORDER BY id ASC`)).rows;
    console.log(`  - Số lượng slots hiện tại: ${slotList.length}`);

    for (let i = 0; i < slotList.length; i++) {
      const oldId = slotList[i].id;
      const newId = i + 1;
      await trx.raw(`UPDATE warehouse.account_slots SET id = ? WHERE id = ?`, [-(newId), oldId]);
    }
    for (let i = 0; i < slotList.length; i++) {
      const newId = i + 1;
      await trx.raw(`UPDATE warehouse.account_slots SET id = ? WHERE id = ?`, [newId, -(newId)]);
    }
    await trx.raw(`SELECT setval('warehouse.account_slots_id_seq', ?);`, [slotList.length]);

    // -------------------------------------------------------------
    // BƯỚC 6: Sắp xếp lại ID cho warehouse.package_products (45 gói)
    // -------------------------------------------------------------
    console.log('[6/7] Sắp xếp lại ID cho warehouse.package_products...');
    const pkgList = (await trx.raw(`SELECT id FROM warehouse.package_products ORDER BY id ASC`)).rows;
    console.log(`  - Số lượng package_products hiện tại: ${pkgList.length}`);

    for (let i = 0; i < pkgList.length; i++) {
      const oldId = pkgList[i].id;
      const newId = i + 1;
      await trx.raw(`UPDATE warehouse.package_products SET id = ? WHERE id = ?`, [-(newId), oldId]);
    }
    for (let i = 0; i < pkgList.length; i++) {
      const newId = i + 1;
      await trx.raw(`UPDATE warehouse.package_products SET id = ? WHERE id = ?`, [newId, -(newId)]);
    }
    await trx.raw(`SELECT setval('warehouse.package_products_id_seq', ?);`, [pkgList.length]);

    // -------------------------------------------------------------
    // BƯỚC 7: Tái tạo lại 6 Foreign Keys nguyên vẹn
    // -------------------------------------------------------------
    console.log('[7/7] Khôi phục toàn bộ các ràng buộc khóa ngoại...');
    await trx.raw(`
      ALTER TABLE warehouse.accounts 
        ADD CONSTRAINT accounts_product_name_id_fkey 
        FOREIGN KEY (product_name_id) REFERENCES warehouse.product_names(id) ON DELETE CASCADE;

      ALTER TABLE warehouse.account_slots 
        ADD CONSTRAINT account_slots_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES warehouse.accounts(id) ON DELETE CASCADE;

      ALTER TABLE warehouse.account_slots 
        ADD CONSTRAINT account_slots_name_id_fkey 
        FOREIGN KEY (name_id) REFERENCES warehouse.product_names(id) ON DELETE CASCADE;

      ALTER TABLE warehouse.package_products 
        ADD CONSTRAINT package_products_product_name_id_fkey 
        FOREIGN KEY (product_name_id) REFERENCES warehouse.product_names(id) ON DELETE CASCADE;

      ALTER TABLE warehouse.package_products 
        ADD CONSTRAINT package_products_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES warehouse.accounts(id) ON DELETE SET NULL;

      ALTER TABLE warehouse.package_products 
        ADD CONSTRAINT package_products_storage_account_id_fkey 
        FOREIGN KEY (storage_account_id) REFERENCES warehouse.accounts(id) ON DELETE SET NULL;
    `);

    console.log('\n>>> ĐÃ HOÀN TẤT TRANSACTION DATABASE AN TOÀN TUYỆT ĐỐI! <<<');
  });

  return { account76NewId };
}

runMigration()
  .then(res => {
    console.log('\nMigration thành công rực rỡ! Account 76 New ID:', res.account76NewId);
    process.exit(0);
  })
  .catch(err => {
    console.error('LỖI MIGRATION (ĐÃ TỰ ĐỘNG ROLLBACK TOÀN BỘ):', err);
    process.exit(1);
  });

