#!/usr/bin/env node
const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");

// Nạp file backend/.env
const backendEnvPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: backendEnvPath, override: true });

const connectionUrl = process.env.DATABASE_URL;

if (!connectionUrl) {
  console.error("❌ Không tìm thấy biến DATABASE_URL trong backend/.env");
  process.exit(1);
}

// Kiểm tra an toàn: Chỉ cho phép chạy trên localhost hoặc 127.0.0.1
try {
  const urlObj = new URL(connectionUrl);
  if (urlObj.hostname !== "localhost" && urlObj.hostname !== "127.0.0.1") {
    console.error(`❌ CHẶN AN TOÀN: Host hiện tại là '${urlObj.hostname}', KHÔNG PHẢI LOCALHOST!`);
    console.error("Script này chỉ được phép chạy trên cơ sở dữ liệu local để tránh mất dữ liệu máy chủ.");
    process.exit(1);
  }
} catch (e) {
  console.error("❌ Chuỗi kết nối DATABASE_URL không hợp lệ:", e.message);
  process.exit(1);
}

const client = new Client({ connectionString: connectionUrl });

async function tableExists(schema, table) {
  const res = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
    [schema, table]
  );
  return res.rowCount > 0;
}

async function sequenceExists(schema, seq) {
  const res = await client.query(
    `SELECT 1 FROM information_schema.sequences WHERE sequence_schema = $1 AND sequence_name = $2`,
    [schema, seq]
  );
  return res.rowCount > 0;
}

async function getCount(schema, table) {
  try {
    const res = await client.query(`SELECT COUNT(*)::int AS count FROM "${schema}"."${table}"`);
    return res.rows[0].count;
  } catch {
    return null;
  }
}

async function main() {
  console.log("=================================================");
  console.log("🧹 DỌN DẸP DỮ LIỆU ĐƠN HÀNG & KHO TÀI KHOẢN LOCAL");
  console.log("=================================================");
  console.log(`📡 Kết nối: ${connectionUrl.replace(/:[^:@/]+@/, ":***@")}`);

  await client.connect();

  // Danh sách các bảng nghiệp vụ cần làm sạch
  const candidateTables = [
    // Kho tài khoản (Warehouse accounts & slots)
    { schema: "warehouse", table: "account_slots" },
    { schema: "warehouse", table: "package_products" },
    { schema: "warehouse", table: "accounts" },
    { schema: "warehouse", table: "stock_services" },
    { schema: "business", table: "product_keys" },
    { schema: "warehouse", table: "product_stocks" },
    { schema: "product", table: "stock_services" },
    { schema: "product", table: "product_stocks" },
    { schema: "system_automation", table: "order_list_keys" },

    // Giao dịch / thanh toán
    { schema: "billing", table: "payment_receipt_financial_audit_log" },
    { schema: "receipt", table: "payment_receipt_financial_audit_log" },
    { schema: "billing", table: "payment_receipt_batch_item" },
    { schema: "receipt", table: "payment_receipt_batch_item" },
    { schema: "billing", table: "payment_receipt_batch" },
    { schema: "receipt", table: "payment_receipt_batch" },
    { schema: "billing", table: "refund_credit_applications" },
    { schema: "receipt", table: "refund_credit_applications" },
    { schema: "billing", table: "refund_credit_notes" },
    { schema: "receipt", table: "refund_credit_notes" },
    { schema: "billing", table: "payment_receipt_financial_state" },
    { schema: "receipt", table: "payment_receipt_financial_state" },
    { schema: "billing", table: "payment_receipt" },
    { schema: "receipt", table: "payment_receipt" },

    // Đơn hàng & slot
    { schema: "business", table: "order_payment_slots" },
    { schema: "orders", table: "order_payment_slots" },
    { schema: "business", table: "order_bank_accounts" },
    { schema: "orders", table: "order_bank_accounts" },
    { schema: "business", table: "order_customer" },
    { schema: "orders", table: "order_customer" },
    { schema: "business", table: "order_user_tracking" },
    { schema: "orders", table: "order_user_tracking" },
    { schema: "business", table: "supplier_order_cost_log" },
    { schema: "partner", table: "supplier_order_cost_log" },
    { schema: "business", table: "supplier_payments" },
    { schema: "partner", table: "supplier_payments" },
    { schema: "business", table: "order_list" },
    { schema: "orders", table: "order_list" },

    // Sổ quỹ & thống kê tài chính
    { schema: "finance", table: "daily_revenue_summary" },
    { schema: "dashboard", table: "daily_revenue_summary" },
    { schema: "finance", table: "dashboard_financial_change_log" },
    { schema: "dashboard", table: "dashboard_financial_change_log" },
    { schema: "finance", table: "financial_account_ledger" },
    { schema: "admin", table: "shop_bank_account_ledger" },
    { schema: "finance", table: "financial_allocation_ledger" },
    { schema: "admin_finance", table: "financial_allocation_ledger" },
    { schema: "finance", table: "trans_dailybalances" },
    { schema: "dashboard", table: "trans_dailybalances" },
    { schema: "finance", table: "wallet_transactions" },
  ];

  // 1. Quét các bảng tồn tại trên hệ thống và đếm số lượng trước khi xóa
  const activeTables = [];
  for (const item of candidateTables) {
    const exists = await tableExists(item.schema, item.table);
    if (exists) {
      const count = await getCount(item.schema, item.table);
      activeTables.push({ ...item, countBefore: count });
    }
  }

  console.log("\n📊 SỐ LƯỢNG BẢN GHI TRƯỚC KHI DỌN DẸP:");
  for (const t of activeTables) {
    console.log(`  - ${t.schema}.${t.table}: ${t.countBefore} bản ghi`);
  }

  // Bắt đầu Transaction
  console.log("\n⚡ Đang thực thi trong Transaction (BEGIN)...");
  await client.query("BEGIN");

  try {
    // 2. Gỡ liên kết stock_service_id, storage_id, stock_id khỏi package_product
    for (const schema of ["business", "product"]) {
      if (await tableExists(schema, "package_product")) {
        try {
          await client.query(`
            UPDATE "${schema}".package_product 
            SET stock_service_id = NULL, storage_id = NULL, stock_id = NULL 
            WHERE stock_service_id IS NOT NULL OR storage_id IS NOT NULL OR stock_id IS NOT NULL
          `);
          console.log(`  🔗 Đã gỡ liên kết stock/storage khỏi ${schema}.package_product`);
        } catch (e) {
          console.log(`  ⚠️ Gỡ liên kết package_product (${schema}): ${e.message}`);
        }
      }
    }

    // 3. Truncate / Delete từng bảng nghiệp vụ
    for (const t of activeTables) {
      await client.query(`TRUNCATE TABLE "${t.schema}"."${t.table}" CASCADE`);
      console.log(`  ✔ Đã làm sạch: ${t.schema}.${t.table}`);
    }

    // 4. Reset sequence suffix payment nếu có
    for (const schema of ["business", "orders", "public"]) {
      if (await sequenceExists(schema, "payment_amount_suffix_seq")) {
        await client.query(`ALTER SEQUENCE "${schema}".payment_amount_suffix_seq RESTART WITH 1`);
        console.log(`  🔄 Đã reset sequence: ${schema}.payment_amount_suffix_seq về 1`);
      }
    }

    // 5. Reset số dư tài khoản ngân hàng shop về 0
    for (const schema of ["finance", "admin"]) {
      for (const tbl of ["financial_accounts", "shop_bank_accounts"]) {
        if (await tableExists(schema, tbl)) {
          await client.query(
            `UPDATE "${schema}"."${tbl}" SET balance = 0, total_received = 0, total_withdrawn = 0`
          );
          console.log(`  💰 Đã reset số dư & tổng thu/chi bảng ${schema}.${tbl} về 0`);
        }
      }
    }

    await client.query("COMMIT");
    console.log("✅ TRANSACTION COMMIT THÀNH CÔNG!\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ LỖI TRONG QUÁ TRÌNH DỌN DẸP - ĐÃ ROLLBACK:", err.message);
    throw err;
  }

  // 6. Kiểm tra lại số lượng sau khi dọn dẹp
  console.log("📊 SỐ LƯỢNG BẢN GHI SAU KHI DỌN DẸP:");
  for (const t of activeTables) {
    const after = await getCount(t.schema, t.table);
    console.log(`  - ${t.schema}.${t.table}: ${after} bản ghi`);
  }

  // 7. Xác nhận dữ liệu danh mục & người dùng được bảo tồn
  console.log("\n🛡️ KIỂM TRA BẢO TỒN DỮ LIỆU CỐT LÕI:");
  const preserved = [
    { schema: "finance", table: "users" },
    { schema: "admin", table: "users" },
    { schema: "business", table: "category" },
    { schema: "product", table: "category" },
    { schema: "business", table: "product" },
    { schema: "product", table: "product" },
    { schema: "business", table: "variant" },
    { schema: "product", table: "variant" },
    { schema: "warehouse", table: "product_names" },
    { schema: "business", table: "supplier" },
    { schema: "partner", table: "supplier" },
  ];

  for (const p of preserved) {
    if (await tableExists(p.schema, p.table)) {
      const cnt = await getCount(p.schema, p.table);
      console.log(`  ✔ ${p.schema}.${p.table}: ${cnt} bản ghi (AN TOÀN)`);
    }
  }

  console.log("\n🎉 HOÀN TẤT DỌN DẸP DỮ LIỆU TRÊN LOCAL DB THÀNH CÔNG!");
}

main()
  .catch((e) => {
    console.error("Thao tác thất bại:", e);
    process.exitCode = 1;
  })
  .finally(() => {
    client.end().catch(() => {});
  });
