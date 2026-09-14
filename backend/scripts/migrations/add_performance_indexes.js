require("module-alias/register");
const { db } = require("../../src/db");

async function applyPerformanceIndexes() {
  console.log("=== BẮT ĐẦU TẠO INDEX TỐI ƯU HIỆU NĂNG DATABASE ===");

  // Check columns of product.variant_margin
  const marginCols = await db.raw(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'product' AND table_name = 'variant_margin';
  `);
  console.log("Columns in product.variant_margin:", marginCols.rows.map(r => r.column_name));

  const indexStatements = [
    {
      name: "idx_payment_receipt_id_order_lower",
      sql: `
        CREATE INDEX IF NOT EXISTS idx_payment_receipt_id_order_lower
        ON receipt.payment_receipt (LOWER(TRIM(id_order)))
        WHERE id_order IS NOT NULL AND TRIM(id_order) != '';
      `,
    },
    {
      name: "idx_payment_receipt_id_order_lower_billing",
      sql: `
        CREATE INDEX IF NOT EXISTS idx_payment_receipt_id_order_lower_billing
        ON billing.payment_receipt (LOWER(TRIM(id_order)))
        WHERE id_order IS NOT NULL AND TRIM(id_order) != '';
      `,
    },
    {
      name: "idx_supplier_cost_variant_price",
      sql: `
        CREATE INDEX IF NOT EXISTS idx_supplier_cost_variant_price
        ON product.supplier_cost (variant_id, price);
      `,
    },
    {
      name: "idx_variant_margin_variant_tier",
      sql: `
        CREATE INDEX IF NOT EXISTS idx_variant_margin_variant_tier
        ON product.variant_margin (variant_id, tier_id);
      `,
    },
  ];

  for (const item of indexStatements) {
    try {
      console.log(`Đang tạo index: ${item.name}...`);
      const t0 = Date.now();
      await db.raw(item.sql);
      console.log(`✅ [OK] ${item.name} (${Date.now() - t0} ms)`);
    } catch (err) {
      console.error(`❌ [LỖI] Không thể tạo ${item.name}:`, err.message);
    }
  }

  console.log("=== THÀNH CÔNG: ĐÃ HOÀN TẤT TẠO INDEX DATABASE ===");
  process.exit(0);
}

applyPerformanceIndexes().catch((err) => {
  console.error("Migration thất bại:", err);
  process.exit(1);
});
