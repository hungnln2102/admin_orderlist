const { db, TABLES } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");

/**
 * Tìm số suffix khả dụng nhỏ nhất từ 1 đến 100 chưa được dùng bởi bất kỳ đơn nào hoặc đợt gộp nào đang chờ thanh toán
 * @param {import("knex").Knex | import("knex").Knex.Transaction} [trxContext] - Context Knex transaction nếu đang trong transaction
 */
async function getAvailableSuffix(trxContext = null) {
  const queryDb = trxContext || db;
  try {
    // 1. Lấy tất cả giá / suffix của các đơn đang ở trạng thái UNPAID hoặc RENEW_REQUIRED
    const pendingOrders = await queryDb(TABLES.ORDER_LIST)
      .select("price", "gross_selling_price")
      .whereIn("status", [ORDER_STATUS.UNPAID, ORDER_STATUS.RENEW_REQUIRED]);

    // 2. Trích xuất các suffix (phần dư % 100) đang được sử dụng bởi đơn lẻ
    const usedSuffixes = new Set();
    for (const order of pendingOrders) {
      const p = Math.round(Number(order.price || order.gross_selling_price || 0));
      if (p > 0) {
        const suffix = p % 100;
        if (suffix >= 1 && suffix <= 100) {
          usedSuffixes.add(suffix);
        }
      }
    }

    // 3. Quét toàn bộ slot_suffix của các đợt gộp PENDING còn hiệu lực
    try {
      const pendingBatches = await queryDb(TABLES.BATCH_PAYMENT_REQUESTS)
        .select("slot_suffix", "total_amount")
        .where("status", "PENDING")
        .andWhere("expires_at", ">=", queryDb.fn.now());

      for (const batch of pendingBatches) {
        const s = Number(batch.slot_suffix || 0);
        if (s >= 1 && s <= 100) {
          usedSuffixes.add(s);
        } else {
          const total = Math.round(Number(batch.total_amount || 0));
          const rem = total % 100;
          if (rem >= 1 && rem <= 100) {
            usedSuffixes.add(rem);
          }
        }
      }
    } catch (batchErr) {
      console.warn("[SlotSuffix] Bỏ qua quét batch_payment_requests:", batchErr.message);
    }

    // 4. Tìm số đầu tiên từ 1..100 chưa nằm trong usedSuffixes
    for (let s = 1; s <= 100; s++) {
      if (!usedSuffixes.has(s)) {
        return s;
      }
    }

    // Nếu cả 100 suffix đều đang bận (rất hiếm), trả về ngẫu nhiên từ 1..100
    return Math.floor(Math.random() * 100) + 1;
  } catch (error) {
    console.error("Lỗi khi cấp Slot Suffix:", error.message);
    return Math.floor(Math.random() * 100) + 1;
  }
}

/**
 * Tính số tiền kỳ vọng = Giá trên cơ sở + Suffix (1..100)
 */
function applySuffixToPrice(basePrice, suffix) {
  const priceNum = Math.round(Number(basePrice || 0));
  const baseRounded = Math.floor(priceNum / 100) * 100;
  return baseRounded + Number(suffix);
}

module.exports = {
  getAvailableSuffix,
  applySuffixToPrice,
};
