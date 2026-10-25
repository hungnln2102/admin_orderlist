/**
 * clearData.js
 * Script dọn dẹp (truncate) toàn bộ dữ liệu giao dịch, đơn hàng và thống kê để test lại luồng từ đầu.
 */

require("module-alias/register");
const { db } = require("./index");

async function clearAllData() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DB_TRUNCATE !== "true") {
    console.error("🛑 [ClearData] Bị chặn: Tuyệt đối không được chạy truncate database trên môi trường PRODUCTION!");
    process.exit(1);
  }
  console.log("🧹 [ClearData] Bắt đầu xóa sạch dữ liệu local để test luồng mới...");
  try {
    await db.raw('TRUNCATE TABLE business.order_list CASCADE;');
    console.log("✅ Đã xóa sạch order_list");
  } catch (e) { console.log("⚠️ order_list:", e.message); }

  try {
    await db.raw('TRUNCATE TABLE billing.payment_receipt CASCADE;');
    console.log("✅ Đã xóa sạch payment_receipt");
  } catch (e) { console.log("⚠️ payment_receipt:", e.message); }

  try {
    await db.raw('TRUNCATE TABLE billing.payment_receipt_allocations CASCADE;');
    console.log("✅ Đã xóa sạch payment_receipt_allocations");
  } catch (e) { console.log("⚠️ payment_receipt_allocations:", e.message); }

  try {
    await db.raw('TRUNCATE TABLE finance.daily_revenue_summary CASCADE;');
    console.log("✅ Đã xóa sạch daily_revenue_summary");
  } catch (e) { console.log("⚠️ daily_revenue_summary:", e.message); }

  try {
    await db.raw('TRUNCATE TABLE billing.payment_receipt_batch CASCADE;');
    console.log("✅ Đã xóa sạch payment_receipt_batch");
  } catch (e) { console.log("⚠️ payment_receipt_batch:", e.message); }

  try {
    await db.raw('TRUNCATE TABLE billing.payment_receipt_batch_item CASCADE;');
    console.log("✅ Đã xóa sạch payment_receipt_batch_item");
  } catch (e) { console.log("⚠️ payment_receipt_batch_item:", e.message); }

  try {
    await db.raw('TRUNCATE TABLE billing.payment_receipt_financial_audit_log CASCADE;');
    console.log("✅ Đã xóa sạch payment_receipt_financial_audit_log");
  } catch (e) { console.log("⚠️ payment_receipt_financial_audit_log:", e.message); }

  try {
    await db.raw('TRUNCATE TABLE billing.refund_credit_notes CASCADE;');
    console.log("✅ Đã xóa sạch refund_credit_notes");
  } catch (e) { console.log("⚠️ refund_credit_notes:", e.message); }

  try {
    await db.raw('TRUNCATE TABLE billing.refund_credit_applications CASCADE;');
    console.log("✅ Đã xóa sạch refund_credit_applications");
  } catch (e) { console.log("⚠️ refund_credit_applications:", e.message); }

  try {
    await db.raw('TRUNCATE TABLE business.supplier_order_cost_log CASCADE;');
    console.log("✅ Đã xóa sạch supplier_order_cost_log");
  } catch (e) { console.log("⚠️ supplier_order_cost_log:", e.message); }

  try {
    await db.raw('TRUNCATE TABLE system_automation.domain_event_store CASCADE;');
    console.log("✅ Đã xóa sạch domain_event_store");
  } catch (e) { console.log("⚠️ domain_event_store:", e.message); }

  try {
    await db.raw('TRUNCATE TABLE system_automation.notification_logs CASCADE;');
    console.log("✅ Đã xóa sạch notification_logs");
  } catch (e) { console.log("⚠️ notification_logs:", e.message); }

  console.log("🎉 [ClearData] Hoàn tất dọn dẹp toàn bộ dữ liệu!");
  process.exit(0);
}

clearAllData().catch((err) => {
  console.error("❌ [ClearData] Lỗi:", err);
  process.exit(1);
});
