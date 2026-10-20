/**
 * simulate_v1_import.js
 * Script giả lập import dữ liệu từ cơ sở dữ liệu V1 sang V2 Clean Architecture.
 */
const { db } = require("../src/db");

async function simulateV1Import() {
  console.log("==========================================");
  console.log("🚀 BẮT ĐẦU GIẢ LẬP IMPORT DỮ LIỆU TỪ V1 SANG V2");
  console.log("==========================================");

  try {
    // 1. Kiểm tra kết nối DB V2 và schema đích
    const [{ count: orderCount }] = await db("business.order_list").count();
    const [{ count: accountCount }] = await db("finance.financial_accounts").count();
    const [{ count: receiptCount }] = await db("billing.payment_receipt").count();
    const [{ count: assetCount }] = await db("finance.personal_assets").count();

    console.log(`📊 Trạng thái hiện tại của Database V2:`);
    console.log(`   - Bảng Đơn hàng (business.order_list): ${orderCount} bản ghi`);
    console.log(`   - Bảng Tài khoản (finance.financial_accounts): ${accountCount} bản ghi`);
    console.log(`   - Bảng Biên lai (billing.payment_receipt): ${receiptCount} bản ghi`);
    console.log(`   - Bảng Tài sản/Nợ (finance.personal_assets): ${assetCount} bản ghi`);

    console.log("\n📦 Giả lập map dữ liệu mẫu từ V1:");
    
    await db.transaction(async (trx) => {
      // Giả lập insert 1 tài khoản cá nhân từ V1 sang V2 với account_scope = 'PERSONAL'
      const samplePersonalAccount = {
        account_type: "bank",
        label: "Techcombank cá nhân (Mới từ V1)",
        account_number: "1903999888",
        account_holder: "NGUYEN VAN A",
        bank_bin: "970407",
        bank_short_code: "TCB",
        bank_display_name: "Techcombank",
        account_scope: "PERSONAL",
        balance: 15000000,
        is_active: true,
      };

      const [insertedAcc] = await trx("finance.financial_accounts")
        .insert(samplePersonalAccount)
        .returning("id");

      console.log(`   ✅ Đã giả lập map thành công tài khoản cá nhân V1 -> V2 (ID: ${insertedAcc.id || insertedAcc})`);

      // Giả lập map sổ tiết kiệm V1 sang personal_assets V2
      const sampleSavings = {
        name: "Sổ tiết kiệm BIDV 6 tháng (V1 Migrated)",
        type: "SAVINGS",
        amount: 50000000,
        note: "Được chuyển đổi từ dữ liệu V1",
        profit_enabled: true,
        annual_interest_rate: 6.5,
        profit_destination: "CASH_BANK",
        profit_account_id: insertedAcc.id || insertedAcc,
      };

      const [insertedAsset] = await trx("finance.personal_assets")
        .insert(sampleSavings)
        .returning("id");

      console.log(`   ✅ Đã giả lập map thành công sổ tiết kiệm V1 -> V2 (ID: ${insertedAsset.id || insertedAsset})`);
    });

    console.log("\n✨ GIẢ LẬP IMPORT V1 -> V2 THÀNH CÔNG RỰC RỠ!");
    console.log("==========================================");
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi giả lập import V1 -> V2:", err);
    process.exit(1);
  }
}

simulateV1Import();
