const { TABLES } = require("@/db");

/**
 * Kiểm tra xem một NCC hoặc đơn hàng có Nhà Cung Cấp (NCC) là Mavryk (Chủ shop) hay không.
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trxOrDb
 * @param {object|number|string} orderOrSupplyId
 * @returns {Promise<boolean>}
 */
async function isMavrykSupplier(trxOrDb, orderOrSupplyId) {
  if (!orderOrSupplyId) return false;

  // Nếu truyền vào object order hoặc event payload
  if (typeof orderOrSupplyId === "object") {
    // 1. Kiểm tra trường supply / supplier_name nếu có
    const supplyStr = String(
      orderOrSupplyId.supplier_name ||
      orderOrSupplyId.supply_name ||
      orderOrSupplyId.supply ||
      ""
    ).trim().toLowerCase();
    if (supplyStr === "mavryk") return true;

    // 2. Kiểm tra supply_id
    if (orderOrSupplyId.supply_id != null) {
      return await isMavrykSupplier(trxOrDb, Number(orderOrSupplyId.supply_id));
    }

    // 3. Nếu chỉ có orderId hoặc id_order mà chưa có supply_id trong payload
    const orderId = orderOrSupplyId.orderId || orderOrSupplyId.id;
    const idOrder = orderOrSupplyId.id_order;
    if (orderId || idOrder) {
      try {
        const query = trxOrDb(TABLES.ORDER_LIST);
        if (orderId) query.where({ id: orderId });
        else query.where({ id_order: idOrder });
        const found = await query.select("supply_id").first();
        if (found && found.supply_id != null) {
          return await isMavrykSupplier(trxOrDb, Number(found.supply_id));
        }
      } catch {
        return false;
      }
    }

    return false;
  }

  // Nếu truyền vào supplyId (number/string)
  const supplyId = Number(orderOrSupplyId);
  if (!supplyId) return false;
  if (supplyId === 1 || supplyId === 22) return true;

  try {
    const sup = await trxOrDb(TABLES.SUPPLIER)
      .where({ id: supplyId })
      .select("supplier_name")
      .first();
    return Boolean(sup && String(sup.supplier_name || "").trim().toLowerCase() === "mavryk");
  } catch {
    return false;
  }
}

/**
 * Kiểm tra đồng bộ nhanh nếu order đã có sẵn supplier_name hoặc supply_id
 * @param {object} order
 * @returns {boolean}
 */
function isMavrykSupplierSync(order) {
  if (!order) return false;
  if (Number(order.supply_id) === 1 || Number(order.supply_id) === 22) return true;
  const supplyStr = String(
    order.supplier_name ||
    order.supply_name ||
    order.supply ||
    ""
  ).trim().toLowerCase();
  if (supplyStr === "mavryk") return true;
  return false;
}

module.exports = {
  isMavrykSupplier,
  isMavrykSupplierSync,
};

