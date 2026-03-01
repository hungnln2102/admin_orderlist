/**
 * Kiểm tra variant có đang được đơn hàng tham chiếu (id_product) không.
 * Dùng để chặn xóa sản phẩm ở bảng giá / thông tin sản phẩm khi còn đơn tham chiếu.
 * @param {number} variantId - ID variant (product)
 * @returns {Promise<boolean>} true nếu có ít nhất một đơn tham chiếu
 */
const { db } = require("../db");
const { ORDERS_SCHEMA, tableName, SCHEMA_ORDERS } = require("../config/dbSchema");

const idProductCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT;
const orderListTable = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const orderExpiredTable = tableName(ORDERS_SCHEMA.ORDER_EXPIRED.TABLE, SCHEMA_ORDERS);
const orderCanceledTable = tableName(ORDERS_SCHEMA.ORDER_CANCELED.TABLE, SCHEMA_ORDERS);

const isVariantReferencedByOrders = async (variantId) => {
  if (variantId == null || !Number.isFinite(Number(variantId))) return false;
  const id = Number(variantId);
  const countList = await db(orderListTable).where(idProductCol, id).count("* as c").first();
  if (Number(countList?.c || 0) > 0) return true;
  const countExpired = await db(orderExpiredTable).where(idProductCol, id).count("* as c").first();
  if (Number(countExpired?.c || 0) > 0) return true;
  const countCanceled = await db(orderCanceledTable).where(idProductCol, id).count("* as c").first();
  return Number(countCanceled?.c || 0) > 0;
};

module.exports = {
  isVariantReferencedByOrders,
};
