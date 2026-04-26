const { db } = require("../../db");

let cache = { value: null, checkedAt: 0 };
const CACHE_MS = 5 * 60 * 1000;

/**
 * Cột `orders.order_list.created_at` (migration 083) — nếu chưa có, dashboard dùng order_date làm birth.
 * Kết quả cache vài phút để tránh query information_schema mỗi request.
 */
async function orderListHasCreatedAtColumn() {
  const now = Date.now();
  if (cache.value !== null && now - cache.checkedAt < CACHE_MS) {
    return cache.value;
  }
  const r = await db.raw(
    `select 1 as ok
     from information_schema.columns
     where table_schema = 'orders'
       and table_name = 'order_list'
       and column_name = 'created_at'
     limit 1`
  );
  const has = Array.isArray(r.rows) && r.rows.length > 0;
  cache = { value: has, checkedAt: now };
  return has;
}

function clearOrderListCreatedAtCacheForTests() {
  cache = { value: null, checkedAt: 0 };
}

module.exports = {
  orderListHasCreatedAtColumn,
  clearOrderListCreatedAtCacheForTests,
};
