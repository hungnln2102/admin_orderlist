/**
 * Script dọn dẹp các biên lai tách dư do slot suffix (<= 100 VNĐ).
 * 
 * Cách hoạt động:
 * 1. Tìm các biên lai có `note LIKE '[Tách dư GD #%'` và `amount <= 100`.
 * 2. Lấy ID biên lai gốc từ ghi chú `[Tách dư GD #<parentId>]`.
 * 3. Cộng gộp số tiền phần dư này trở lại biên lai gốc: `parent.amount = parent.amount + child.amount`.
 * 4. Xóa biên lai con dư thừa.
 * 
 * Chạy thử nghiệm (dry-run):
 *   node scripts/cleanup_slot_suffix_split_receipts.js
 * 
 * Chạy thực tế (áp dụng thay đổi):
 *   node scripts/cleanup_slot_suffix_split_receipts.js --apply
 */

require("module-alias/register");
const { db } = require("@/db");

const isApplyMode = process.argv.includes("--apply");

async function cleanupSlotSuffixSplitReceipts() {
  console.log(`=== START CLEANUP SLOT SUFFIX SPLIT RECEIPTS (${isApplyMode ? "APPLY MODE" : "DRY-RUN MODE"}) ===`);

  try {
    const splitReceipts = await db("billing.payment_receipt")
      .select("id", "amount", "note", "original_order_code", "payment_date")
      .where("note", "like", "[Tách dư GD #%")
      .andWhere("amount", "<=", 100)
      .orderBy("id", "asc");

    console.log(`Tìm thấy ${splitReceipts.length} biên lai tách dư slot suffix (<= 100 VNĐ).`);

    let mergedCount = 0;
    let skippedCount = 0;

    for (const child of splitReceipts) {
      const match = String(child.note).match(/\[Tách dư GD #(\d+)\]/);
      if (!match) {
        console.log(`- Biên lai #${child.id}: Không trích xuất được parent ID từ note "${child.note}". Bỏ qua.`);
        skippedCount++;
        continue;
      }

      const parentId = parseInt(match[1], 10);
      const childAmount = Number(child.amount) || 0;

      const parent = await db("billing.payment_receipt")
        .select("id", "amount", "id_order", "note")
        .where("id", parentId)
        .first();

      if (!parent) {
        if (childAmount === 0) {
          console.log(`- [Đã xóa rác 0đ] Biên lai con #${child.id} (${childAmount}đ): Không có parent #${parentId}.`);
          if (isApplyMode) {
            await db("billing.payment_receipt").where("id", child.id).del();
          }
          mergedCount++;
        } else {
          console.log(`- Biên lai con #${child.id} (${childAmount}đ): Không tìm thấy biên lai gốc #${parentId}. Bỏ qua.`);
          skippedCount++;
        }
        continue;
      }

      const parentAmount = Number(parent.amount) || 0;
      const newParentAmount = parentAmount + childAmount;

      console.log(`- [Khôi phục] GD gốc #${parentId} (${parentAmount}đ + ${childAmount}đ -> ${newParentAmount}đ) | Đã xóa GD con #${child.id}`);

      if (isApplyMode) {
        await db.transaction(async (trx) => {
          await trx("billing.payment_receipt")
            .where("id", parentId)
            .update({ amount: newParentAmount });

          await trx("billing.payment_receipt")
            .where("id", child.id)
            .del();
        });
      }

      mergedCount++;
    }

    console.log(`\n=== TỔNG KẾT ===`);
    console.log(`- Tổng số biên lai tách dư slot suffix tìm thấy: ${splitReceipts.length}`);
    console.log(`- Số biên lai đã xử lý/gộp: ${mergedCount}`);
    console.log(`- Số biên lai bỏ qua: ${skippedCount}`);

    if (!isApplyMode && splitReceipts.length > 0) {
      console.log(`\nLƯU Ý: Đây là chế độ DRY-RUN (chạy thử). Để áp dụng thay đổi vào Database, chạy lệnh:`);
      console.log(`  node scripts/cleanup_slot_suffix_split_receipts.js --apply`);
    }
  } catch (err) {
    console.error("Lỗi khi thực hiện dọn dẹp biên lai slot suffix:", err);
  } finally {
    await db.destroy();
  }
}

cleanupSlotSuffixSplitReceipts();
