require('dotenv').config();
const { db, TABLES } = require('./src/db');

async function test3Tabs() {
  try {
    // Tab 1: Biên lai Đơn hàng (đã gắn id_order)
    const tab1 = await db(TABLES.PAYMENT_RECEIPT)
      .whereNotNull('id_order')
      .where('id_order', '!=', '')
      .count('id as count')
      .first();

    // Tab 2: Biên lai Khác (tiền ra / chi phí / ngoài luồng / đã gắn log chi phí)
    const tab2 = await db(TABLES.PAYMENT_RECEIPT)
      .where((b) => {
        b.whereNull('id_order').orWhere('id_order', '');
      })
      .where('transfer_type', 'out')
      .count('id as count')
      .first();

    // Tab 3: Biên lai Chưa liệt kê (tiền vào nhưng chưa được định danh / chưa gắn id_order)
    const tab3 = await db(TABLES.PAYMENT_RECEIPT)
      .where((b) => {
        b.whereNull('id_order').orWhere('id_order', '');
      })
      .where((b) => {
        b.whereNull('transfer_type').orWhere('transfer_type', '!=', 'out');
      })
      .count('id as count')
      .first();

    console.log("Tab 1 (Biên lai Đơn hàng):", Number(tab1.count));
    console.log("Tab 2 (Biên lai Khác / Chi phí / Đã gắn log):", Number(tab2.count));
    console.log("Tab 3 (Biên lai Chưa liệt kê / Chưa định danh):", Number(tab3.count));
    console.log("SUM:", Number(tab1.count) + Number(tab2.count) + Number(tab3.count));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

test3Tabs();
