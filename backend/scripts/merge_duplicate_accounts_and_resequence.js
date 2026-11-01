const { db, withTransaction } = require('@/db');
const fs = require('fs');

async function runMerge() {
  console.log('=== BẮT ĐẦU GOM TÀI KHOẢN TRÙNG EMAIL & SẮP XẾP LẠI ID KHO HÀNG ===\n');

  let acc45NewId = null;

  await withTransaction(async (trx) => {
    // -------------------------------------------------------------
    // BƯỚC 1: Drop tạm thời các Foreign Keys trỏ vào accounts
    // -------------------------------------------------------------
    console.log('[1/5] Tạm thời gỡ bỏ các ràng buộc khóa ngoại...');
    await trx.raw(`
      ALTER TABLE warehouse.account_slots DROP CONSTRAINT IF EXISTS account_slots_account_id_fkey;
      ALTER TABLE warehouse.package_products DROP CONSTRAINT IF EXISTS package_products_account_id_fkey;
      ALTER TABLE warehouse.package_products DROP CONSTRAINT IF EXISTS package_products_storage_account_id_fkey;
    `);

    // -------------------------------------------------------------
    // BƯỚC 2: Tìm tất cả email bị trùng và gom về 1 ID duy nhất
    // -------------------------------------------------------------
    console.log('[2/5] Tìm và gom các tài khoản trùng email...');
    const duplicates = (await trx.raw(`
      SELECT LOWER(TRIM(account_username)) as email, 
             MIN(id) as primary_id, 
             ARRAY_AGG(id ORDER BY id ASC) as all_ids
      FROM warehouse.accounts
      GROUP BY LOWER(TRIM(account_username))
      HAVING COUNT(*) > 1;
    `)).rows;

    console.log(`  - Tìm thấy ${duplicates.length} email có nhiều tài khoản riêng biệt:`);
    for (const dup of duplicates) {
      const primaryId = dup.primary_id;
      const otherIds = dup.all_ids.filter(id => id !== primaryId);
      console.log(`    * Email: "${dup.email}": giữ ID gốc ${primaryId}, gom các ID phụ [${otherIds.join(', ')}]`);

      // Cập nhật account_slots
      const resSlots = await trx.raw(`
        UPDATE warehouse.account_slots 
        SET account_id = ? 
        WHERE account_id = ANY(?::bigint[]);
      `, [primaryId, otherIds]);

      // Cập nhật package_products.account_id
      const resPkgAcc = await trx.raw(`
        UPDATE warehouse.package_products 
        SET account_id = ? 
        WHERE account_id = ANY(?::bigint[]);
      `, [primaryId, otherIds]);

      // Cập nhật package_products.storage_account_id
      const resPkgStorage = await trx.raw(`
        UPDATE warehouse.package_products 
        SET storage_account_id = ? 
        WHERE storage_account_id = ANY(?::bigint[]);
      `, [primaryId, otherIds]);

      // Xóa các accounts thừa
      const resDel = await trx.raw(`
        DELETE FROM warehouse.accounts 
        WHERE id = ANY(?::bigint[]);
      `, [otherIds]);

      console.log(`      -> Đã chuyển ${resSlots.rowCount} slots, ${resPkgAcc.rowCount} packages chính, ${resPkgStorage.rowCount} packages lưu trữ; xóa ${resDel.rowCount} accounts thừa.`);
    }

    // -------------------------------------------------------------
    // BƯỚC 3: Sắp xếp lại ID cho warehouse.accounts liền mạch từ 1..N
    // -------------------------------------------------------------
    console.log('\n[3/5] Sắp xếp lại ID cho warehouse.accounts liền mạch từ 1...');
    const accList = (await trx.raw(`SELECT id, account_username FROM warehouse.accounts ORDER BY id ASC`)).rows;
    console.log(`  - Số lượng tài khoản duy nhất còn lại: ${accList.length}`);

    // Chuyển sang số âm tạm thời
    for (let i = 0; i < accList.length; i++) {
      const oldId = accList[i].id;
      const newId = i + 1;
      const tempId = -(newId);

      if (String(oldId) === '45') {
        acc45NewId = newId;
      }

      await trx.raw(`UPDATE warehouse.accounts SET id = ? WHERE id = ?`, [tempId, oldId]);
      await trx.raw(`UPDATE warehouse.account_slots SET account_id = ? WHERE account_id = ?`, [tempId, oldId]);
      await trx.raw(`UPDATE warehouse.package_products SET account_id = ? WHERE account_id = ?`, [tempId, oldId]);
      await trx.raw(`UPDATE warehouse.package_products SET storage_account_id = ? WHERE storage_account_id = ?`, [tempId, oldId]);
    }

    // Đổi sang số dương mới liền mạch (1..N)
    for (let i = 0; i < accList.length; i++) {
      const newId = i + 1;
      const tempId = -(newId);

      await trx.raw(`UPDATE warehouse.accounts SET id = ? WHERE id = ?`, [newId, tempId]);
      await trx.raw(`UPDATE warehouse.account_slots SET account_id = ? WHERE account_id = ?`, [newId, tempId]);
      await trx.raw(`UPDATE warehouse.package_products SET account_id = ? WHERE account_id = ?`, [newId, tempId]);
      await trx.raw(`UPDATE warehouse.package_products SET storage_account_id = ? WHERE storage_account_id = ?`, [newId, tempId]);
    }

    await trx.raw(`SELECT setval('warehouse.accounts_id_seq', ?);`, [accList.length]);
    console.log(`  - Đã sắp xếp lại 1..${accList.length}. Tài khoản 45 (peterjanos174@gmail.com) -> ID mới: ${acc45NewId}`);

    // -------------------------------------------------------------
    // BƯỚC 4: Khôi phục lại các Foreign Keys nguyên vẹn
    // -------------------------------------------------------------
    console.log('[4/5] Khôi phục toàn bộ các ràng buộc khóa ngoại...');
    await trx.raw(`
      ALTER TABLE warehouse.account_slots 
        ADD CONSTRAINT account_slots_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES warehouse.accounts(id) ON DELETE CASCADE;

      ALTER TABLE warehouse.package_products 
        ADD CONSTRAINT package_products_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES warehouse.accounts(id) ON DELETE SET NULL;

      ALTER TABLE warehouse.package_products 
        ADD CONSTRAINT package_products_storage_account_id_fkey 
        FOREIGN KEY (storage_account_id) REFERENCES warehouse.accounts(id) ON DELETE SET NULL;
    `);

    console.log('\n>>> ĐÃ HOÀN TẤT TRANSACTION DATABASE AN TOÀN TUYỆT ĐỐI! <<<');
  });

  return { acc45NewId };
}

runMerge()
  .then(res => {
    console.log('\nMigration thành công! Account 45 New ID:', res.acc45NewId);
    process.exit(0);
  })
  .catch(err => {
    console.error('LỖI MIGRATION (ĐÃ ROLLBACK TOÀN BỘ):', err);
    process.exit(1);
  });
