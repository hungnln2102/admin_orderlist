const { db } = require("@/db");

const SCHEMA_ORDERS = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "orders";
const getOrderTable = () => db.withSchema(SCHEMA_ORDERS).from("order_list");

/**
 * Tìm số suffix khả dụng nhỏ nhất từ 1 đến 100 chưa được dùng bởi bất kỳ đơn nào đang chờ thanh toán
 */
async function getAvailableSuffix() {
  try {
    // 1. Lấy tất cả giá / suffix của các đơn đang ở trạng thái Chưa Thanh Toán hoặc Cần gia hạn
    const pendingOrders = await getOrderTable()
      .select("price", "gross_selling_price")
      .where((builder) => {
        builder
          .whereILike("status", "%Chưa Thanh Toán%")
          .orWhereILike("status", "%Cần gia hạn%")
          .orWhereILike("status", "%Chờ xử lý%");
      });

    // 2. Trích xuất các suffix (phần dư % 100) đang được sử dụng
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

    // 3. Tìm số đầu tiên từ 1..100 chưa nằm trong usedSuffixes
    for (let s = 1; s <= 100; s++) {
      if (!usedSuffixes.has(s)) {
        return s;
      }
    }

    // Nếu cả 100 suffix đều đang bận (rất hiếm), trả về ngẫu nhiên từ 1..100
    return Math.floor(Math.random() * 100) + 1;
  } catch (error) {
    console.error("Lỗi khi cấp Slot Suffix:", error.message);
    // Fallback ngẫu nhiên 1..100
    return Math.floor(Math.random() * 100) + 1;
  }
}

/**
 * Tính số tiền kỳ vọng = Giá tròn cơ sở + Suffix (1..100)
 * Ví dụ: basePrice = 150000, suffix = 23 -> 150023
 */
function applySuffixToPrice(basePrice, suffix) {
  const priceNum = Math.round(Number(basePrice || 0));
  // Đảm bảo basePrice tròn hàng trăm (ví dụ: 150000)
  const baseRounded = Math.floor(priceNum / 100) * 100;
  return baseRounded + Number(suffix);
}

module.exports = {
  getAvailableSuffix,
  applySuffixToPrice,
};
