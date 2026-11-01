const { db, withTransaction } = require('@/db');

async function runMigration() {
  console.log('=== BẮT ĐẦU MIGRATION GOM ADOBE EDU VÀO ADOBE & SẮP XẾP LẠI ID DỊCH VỤ ===\n');

  await withTransaction(async (trx) => {
    // -------------------------------------------------------------
    // BƯỚC 1: Tạm thời drop các Foreign Keys nội bộ trỏ vào product_names
    // -------------------------------------------------------------
    console.log('[1/5] Tạm thời gỡ bỏ các ràng buộc khóa ngoại nội bộ...');
    await trx.raw(`
      ALTER TABLE warehouse.accounts DROP CONSTRAINT IF EXISTS accounts_product_name_id_fkey;
      ALTER TABLE warehouse.account_slots DROP CONSTRAINT IF EXISTS account_slots_name_id_fkey;
      ALTER TABLE warehouse.package_products DROP CONSTRAINT IF EXISTS package_products_product_name_id_fkey;
    `);

    // -------------------------------------------------------------
    // BƯỚC 2: Gom 4 slot Adobe Edu (id: 3) sang Adobe (id: 2) và gán tag
    // -------------------------------------------------------------
    console.log('[2/5] Gom tài khoản Adobe Edu sang Adobe (id: 2) và gán tag...');
    // Gán tag 'Edu' cho 4 slot của Adobe Edu
    const resEdu = await trx.raw(`
      UPDATE warehouse.account_slots 
      SET name_id = 2, variant_tag = 'Edu', updated_at = NOW() 
      WHERE name_id = 3;
    `);
    console.log(`  - Chuyển Adobe Edu -> Adobe [Edu]: ${resEdu.rowCount} slots`);

    // Gán tag '1PC Cố Định' cho các slot của Adobe hiện tại nếu chưa có tag
    const resAdobe = await trx.raw(`
      UPDATE warehouse.account_slots 
      SET variant_tag = '1PC Cố Định', updated_at = NOW() 
      WHERE name_id = 2 AND (variant_tag IS NULL OR variant_tag = '');
    `);
    console.log(`  - Gán tag '1PC Cố Định' cho slot Adobe gốc: ${resAdobe.rowCount} slots`);

    // Xóa dịch vụ Adobe Edu khỏi product_names
    const resDel = await trx.raw(`
      DELETE FROM warehouse.product_names 
      WHERE id = 3;
    `);
    console.log(`  - Đã xóa dịch vụ Adobe Edu: ${resDel.rowCount} row`);

    // -------------------------------------------------------------
    // BƯỚC 3: Sắp xếp lại ID cho warehouse.product_names (8 dịch vụ)
    // -------------------------------------------------------------
    console.log('[3/5] Sắp xếp lại ID cho warehouse.product_names...');
    const prodList = (await trx.raw(`SELECT id, name FROM warehouse.product_names ORDER BY id ASC`)).rows;
    console.log(`  - Số lượng dịch vụ còn lại: ${prodList.length}`);

    // Chuyển sang số âm tạm thời
    for (let i = 0; i < prodList.length; i++) {
      const oldId = prodList[i].id;
      const newId = i + 1;
      const tempId = -(newId);

      await trx.raw(`UPDATE warehouse.product_names SET id = ? WHERE id = ?`, [tempId, oldId]);
      await trx.raw(`UPDATE warehouse.account_slots SET name_id = ? WHERE name_id = ?`, [tempId, oldId]);
      await trx.raw(`UPDATE warehouse.package_products SET product_name_id = ? WHERE product_name_id = ?`, [tempId, oldId]);
      await trx.raw(`UPDATE warehouse.accounts SET product_name_id = ? WHERE product_name_id = ?`, [tempId, oldId]);
    }

    // Đổi sang số dương mới liền mạch (1..N)
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
    // BƯỚC 4: Khôi phục lại các Foreign Keys nguyên vẹn
    // -------------------------------------------------------------
    console.log('[4/5] Khôi phục toàn bộ các ràng buộc khóa ngoại...');
    await trx.raw(`
      ALTER TABLE warehouse.accounts 
        ADD CONSTRAINT accounts_product_name_id_fkey 
        FOREIGN KEY (product_name_id) REFERENCES warehouse.product_names(id) ON DELETE CASCADE;

      ALTER TABLE warehouse.account_slots 
        ADD CONSTRAINT account_slots_name_id_fkey 
        FOREIGN KEY (name_id) REFERENCES warehouse.product_names(id) ON DELETE CASCADE;

      ALTER TABLE warehouse.package_products 
        ADD CONSTRAINT package_products_product_name_id_fkey 
        FOREIGN KEY (product_name_id) REFERENCES warehouse.product_names(id) ON DELETE CASCADE;
    `);

    console.log('\n>>> ĐÃ HOÀN TẤT TRANSACTION DATABASE AN TOÀN TUYỆT ĐỐI! <<<');
  });

  return true;
}

runMigration()
  .then(() => {
    console.log('\nMigration thành công rực rỡ!');
    process.exit(0);
  })
  .catch(err => {
    console.error('LỖI MIGRATION (ĐÃ TỰ ĐỘNG ROLLBACK TOÀN BỘ):', err);
    process.exit(1);
  });
