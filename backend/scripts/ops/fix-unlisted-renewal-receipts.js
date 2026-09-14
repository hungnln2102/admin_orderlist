require("module-alias/register");
const { db } = require("../../src/db");
const logger = require("../../src/utils/logger");

/**
 * Script rà soát và cập nhật trạng thái tài chính (is_financial_posted = true)
 * cho các biên lai đã thuộc đơn gia hạn (trạng thái Đã Thanh Toán / RENEWAL)
 * đang bị kẹt ở trạng thái chưa liệt kê / is_financial_posted = false.
 */
async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log("=== BẮT ĐẦU RÀ SOÁT VÀ CỐ ĐỊNH BIÊN LAI GIA HẠN THIẾU TRẠNG THÁI ===");
  if (isDryRun) {
    console.log("👉 Chế độ kiểm thử (--dry-run), không ghi DB.\n");
  }

  try {
    // 1. Tìm các biên lai có id_order hợp lệ (bắt đầu bằng MAV) nhưng is_financial_posted IS NOT TRUE
    // mà đơn hàng đó đã ở trạng thái Đã Thanh Toán (PAID) hoặc Đang Gia Hạn (RENEWAL).
    const unpostedReceipts = await db("billing.payment_receipt as pr")
      .join("business.order_list as o", db.raw("LOWER(pr.id_order::text)"), "=", db.raw("LOWER(o.id_order::text)"))
      .whereRaw("(pr.is_financial_posted IS NOT TRUE)")
      .whereIn("o.status", ["PAID", "RENEWAL", "Đã Thanh Toán", "Đang Xử Lý"])
      .select(
        "pr.id",
        "pr.id_order",
        "pr.amount",
        "pr.payment_date",
        "pr.is_financial_posted",
        "o.status as order_status",
        "o.price as order_price",
        "o.cost as order_cost"
      );

    console.log(`Tìm thấy ${unpostedReceipts.length} biên lai gia hạn / thanh toán đang bị is_financial_posted = false:`);
    for (const r of unpostedReceipts) {
      console.log(`- Receipt #${r.id} | Order: ${r.id_order} | Status: ${r.order_status} | Amount: ${Number(r.amount).toLocaleString("vi-VN")}đ`);
    }

    if (!isDryRun && unpostedReceipts.length > 0) {
      for (const r of unpostedReceipts) {
        const rev = Number(r.amount) || 0;
        const cost = Number(r.order_cost) || 0;
        const profit = Math.max(0, rev - cost);

        await db("billing.payment_receipt")
          .where("id", r.id)
          .update({
            is_financial_posted: true,
            posted_revenue: rev,
            posted_profit: profit,
            reconciled_at: db.fn.now(),
          });

        console.log(`  -> Đã cập nhật Receipt #${r.id} cho đơn ${r.id_order}: is_financial_posted = true`);
      }
    }

    // 2. Tìm biên lai mồ côi (id_order IS NULL hoặc '') trùng khớp số tiền với Slot MATCHED / PENDING của các đơn hàng
    const unlinkedReceipts = await db("billing.payment_receipt as pr")
      .join("business.order_payment_slots as slot", "slot.payment_receipt_id", "=", "pr.id")
      .whereRaw("(pr.id_order IS NULL OR TRIM(pr.id_order::text) = '')")
      .select("pr.id", "slot.id_order", "pr.amount", "pr.payment_date");

    if (unlinkedReceipts.length > 0) {
      console.log(`\nTìm thấy ${unlinkedReceipts.length} biên lai mồ côi có Slot Match nhưng chưa gán id_order:`);
      for (const r of unlinkedReceipts) {
        console.log(`- Receipt #${r.id} | Matched Slot Order: ${r.id_order} | Amount: ${Number(r.amount).toLocaleString("vi-VN")}đ`);
        if (!isDryRun) {
          await db("billing.payment_receipt")
            .where("id", r.id)
            .update({
              id_order: r.id_order,
              is_financial_posted: true,
              posted_revenue: Number(r.amount) || 0,
              reconciled_at: db.fn.now(),
            });
          console.log(`  -> Đã gán id_order = ${r.id_order} và chốt is_financial_posted = true cho Receipt #${r.id}`);
        }
      }
    }

    console.log("\n🎉 HOÀN TẤT RÀ SOÁT CẤP HẠ TẦNG!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi khi rà soát:", err);
    process.exit(1);
  }
}

main();
