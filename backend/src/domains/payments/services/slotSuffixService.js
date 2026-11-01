const { db, TABLES } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");

/**
 * Trích xuất Slot Suffix (1..100) mà đơn hàng đang chiếm dụng
 * Không làm tròn giá gốc!
 * @param {object} order
 * @returns {number|null}
 */
function extractSlotSuffix(order) {
  if (!order) return null;
  const p = Number(order.price || 0);
  const g = Number(order.gross_selling_price || 0);

  // Nếu có gross_selling_price (giá sản phẩm gốc chuẩn)
  if (p > 0 && g > 0 && p > g) {
    const diff = Math.round(p - g);
    if (diff >= 1 && diff <= 100) {
      return diff;
    }
  }

  // Dự phòng cho đơn cũ chưa lưu gross_selling_price
  if (p > 0) {
    const rem = Math.round(p) % 100;
    if (rem >= 1 && rem <= 100) return rem;
    if (rem === 0 && p >= 100) return 100;
  }

  return null;
}

/**
 * Tìm số suffix khả dụng nhỏ nhất từ 1 đến 100 chưa được dùng bởi bất kỳ đơn nào hoặc đợt gộp nào đang chờ thanh toán
 * @param {import("knex").Knex | import("knex").Knex.Transaction} [trxContext] - Context Knex transaction nếu đang trong transaction
 * @param {number|string} [excludeOrderId] - Bỏ qua ID đơn hàng này khi quét slot đang dùng (để không tự coi mình là chiếm trùng)
 */
async function getAvailableSuffix(trxContext = null, excludeOrderId = null) {
  const queryDb = trxContext || db;
  try {
    // 1. Lấy tất cả giá / suffix của các đơn đang ở trạng thái UNPAID hoặc RENEW_REQUIRED
    let pendingOrdersQuery = queryDb(TABLES.ORDER_LIST)
      .select("id", "price", "gross_selling_price")
      .whereIn("status", [ORDER_STATUS.UNPAID, ORDER_STATUS.RENEW_REQUIRED]);

    if (excludeOrderId) {
      pendingOrdersQuery = pendingOrdersQuery.whereNot("id", Number(excludeOrderId));
    }

    const pendingOrders = await pendingOrdersQuery;

    // 2. Trích xuất các suffix đang được sử dụng bởi đơn lẻ
    const usedSuffixes = new Set();
    for (const order of pendingOrders) {
      const suffix = extractSlotSuffix(order);
      if (suffix && suffix >= 1 && suffix <= 100) {
        usedSuffixes.add(suffix);
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
          const resolvedRem = rem === 0 ? 100 : rem;
          if (resolvedRem >= 1 && resolvedRem <= 100) {
            usedSuffixes.add(resolvedRem);
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
 * Tính số tiền kỳ vọng = Đúng Giá Sản Phẩm (KHÔNG LÀM TRÒN) + Suffix (1..100)
 */
function applySuffixToPrice(basePrice, suffix) {
  const base = Number(basePrice || 0);
  return base + Number(suffix || 0);
}

module.exports = {
  extractSlotSuffix,
  getAvailableSuffix,
  applySuffixToPrice,
};
