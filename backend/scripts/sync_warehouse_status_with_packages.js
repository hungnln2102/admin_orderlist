const { db, withTransaction } = require('@/db');

async function syncWarehouseStatus() {
  console.log('=== TIẾN HÀNH ĐỒNG BỘ TRẠNG THÁI TOÀN KHO THEO KHO GÓI SẢN PHẨM ===\n');

  await withTransaction(async (trx) => {
    // 1. Lấy tất cả packages
    const pkgs = (await trx.raw(`
      SELECT id, product_name_id, account_id, storage_account_id
      FROM warehouse.package_products;
    `)).rows;

    // 2. Lấy tất cả slots
    const slots = (await trx.raw(`
      SELECT s.id as slot_id, s.account_id, s.name_id, s.status, a.account_username, p.name as service_name
      FROM warehouse.account_slots s
      JOIN warehouse.product_names p ON s.name_id = p.id
      JOIN warehouse.accounts a ON s.account_id = a.id;
    `)).rows;

    const toInUseIds = [];
    const toAvailableIds = [];

    for (const s of slots) {
      const hasPkg = pkgs.some(pkg => 
        (String(pkg.account_id) === String(s.account_id) || String(pkg.storage_account_id) === String(s.account_id)) &&
        String(pkg.product_name_id) === String(s.name_id)
      );

      if (hasPkg && s.status !== 'IN_USE') {
        toInUseIds.push(s.slot_id);
      } else if (!hasPkg && s.status === 'IN_USE') {
        toAvailableIds.push(s.slot_id);
      }
    }

    console.log(`- Phát hiện ${toInUseIds.length} slots có gói nhưng đang để AVAILABLE -> chuyển sang IN_USE`);
    console.log(`- Phát hiện ${toAvailableIds.length} slots KHÔNG có gói nhưng bị để IN_USE -> hoàn trả về AVAILABLE\n`);

    if (toInUseIds.length > 0) {
      const resInUse = await trx.raw(`
        UPDATE warehouse.account_slots
        SET status = 'IN_USE', updated_at = NOW()
        WHERE id = ANY(?::bigint[]);
      `, [toInUseIds]);
      console.log(`✅ Đã cập nhật ${resInUse.rowCount} slots sang IN_USE (ĐANG SỬ DỤNG)`);
    }

    if (toAvailableIds.length > 0) {
      const resAvail = await trx.raw(`
        UPDATE warehouse.account_slots
        SET status = 'AVAILABLE', updated_at = NOW()
        WHERE id = ANY(?::bigint[]);
      `, [toAvailableIds]);
      console.log(`✅ Đã cập nhật ${resAvail.rowCount} slots về AVAILABLE (TỒN KHO)`);
    }
  });

  console.log('\n>>> ĐÃ HOÀN TẤT TRANSACTION ĐỒNG BỘ TRẠNG THÁI TOÀN KHO! <<<');
  process.exit(0);
}

syncWarehouseStatus().catch(err => {
  console.error('LỖI ĐỒNG BỘ (ĐÃ ROLLBACK):', err);
  process.exit(1);
});

