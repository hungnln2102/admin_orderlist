/**
 * Script gộp / khôi phục id_order cho các biên lai tách dư có original_order_code.
 * 
 * 1. Với các biên lai có id_order IS NULL nhưng original_order_code LIKE 'MAV%' và amount > 0:
 *    -> Gán id_order = original_order_code để đưa về đúng tab Thanh Toán Đơn Hàng.
 * 2. Xóa các biên lai rác 0đ có note 'Tách dư'.
 */

require("module-alias/register");
const { db } = require("@/db");

async function fixRemainingSplitReceipts() {
  console.log("=== THỰC HIỆN FIX VÀ GÔP ID_ORDER CHO CÁC BIÊN LAI TÁCH DƯ ===");

  try {
    // 1. Xóa biên lai 0đ rác
    const deletedCount = await db("billing.payment_receipt")
      .where("note", "like", "%Tách dư%")
      .andWhere("amount", 0)
      .del();
    console.log(`- Đã xóa ${deletedCount} biên lai rác 0đ.`);

    // 2. Cập nhật id_order = original_order_code cho các biên lai tách dư có tiền
    const updatedCount = await db("billing.payment_receipt")
      .whereNull("id_order")
      .whereNotNull("original_order_code")
      .where("original_order_code", "like", "MAV%")
      .where("note", "like", "%Tách dư%")
      .update({
        id_order: db.raw("original_order_code")
      });

    console.log(`- Đã cập nhật id_order cho ${updatedCount} biên lai tách dư về đơn gốc MAV...`);
    console.log("=== HOÀN TẤT FIX DỮ LIỆU BIÊN LAI ===");
  } catch (err) {
    console.error("Lỗi khi fix dữ liệu biên lai:", err);
  } finally {
    await db.destroy();
  }
}

fixRemainingSplitReceipts();
