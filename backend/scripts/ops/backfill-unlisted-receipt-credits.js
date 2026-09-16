require("module-alias/register");
const { db } = require("../../src/db");
const logger = require("../../src/utils/logger");
const { ensureOffFlowRefundCreditNote } = require("@/domains/orders/controller/finance/offFlowRefundCredits");

/**
 * Script rà soát và tạo Phiếu Credit Khả Dụng (refund_credit_notes)
 * cho các biên lai chưa liệt kê (is_financial_posted = false, amount > 0)
 * chưa có credit note tương ứng.
 */
async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log("=== BẮT ĐẦU RÀ SOÁT VÀ TẠO CREDIT CHO BIÊN LAI CHƯA LIỆT KÊ ===");
  if (isDryRun) {
    console.log("👉 Chế độ kiểm thử (--dry-run), không ghi DB.\n");
  }

  try {
    // 1. Tìm các biên lai tiền vào chưa posted và chưa có credit note
    const unlistedReceipts = await db("billing.payment_receipt as pr")
      .leftJoin("billing.refund_credit_notes as rcn", "rcn.payment_receipt_id", "pr.id")
      .whereRaw("(pr.is_financial_posted IS NOT TRUE)")
      .where("pr.amount", ">", 0)
      .whereNull("rcn.id")
      .select(
        "pr.id",
        "pr.id_order",
        "pr.amount",
        "pr.payment_date",
        "pr.note",
        "pr.sender",
        "pr.receiver"
      )
      .orderBy("pr.id", "asc");

    console.log(`Tìm thấy ${unlistedReceipts.length} biên lai chưa liệt kê chưa có credit note:`);
    for (const r of unlistedReceipts) {
      console.log(`- Receipt #${r.id} | Order: ${r.id_order || "N/A"} | Amount: ${Number(r.amount).toLocaleString("vi-VN")}đ | Date: ${r.payment_date}`);
    }

    if (!isDryRun && unlistedReceipts.length > 0) {
      let createdCount = 0;
      for (const r of unlistedReceipts) {
        const d = r.payment_date ? new Date(r.payment_date) : new Date();
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        await db.transaction(async (trx) => {
          await ensureOffFlowRefundCreditNote(trx, {
            paymentReceiptId: r.id,
            offFlowAmount: Number(r.amount),
            monthKey,
            sourceOrderCode: r.id_order || null,
            ruleBranch: "OPS_BACKFILL_UNLISTED_CREDIT",
            note: `Credit khả dụng từ biên lai chưa liệt kê #${r.id}`,
          });
        });
        createdCount++;
        console.log(`  -> Đã tạo Credit Note khả dụng cho Receipt #${r.id}`);
      }
      console.log(`\n Hoàn tất tạo ${createdCount} credit note khả dụng!`);
    } else if (isDryRun && unlistedReceipts.length > 0) {
      console.log(`\n Chạy lệnh không kèm --dry-run để thực thi tạo credit note.`);
    } else {
      console.log(`\n Tất cả biên lai chưa liệt kê đã có credit note hợp lệ.`);
    }
  } catch (error) {
    console.error("Lỗi khi thực hiện backfill credit:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
