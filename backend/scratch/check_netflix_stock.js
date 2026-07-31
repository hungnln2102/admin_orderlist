require('module-alias/register');
const { db } = require('@/db');
const {
  ORDERS_SCHEMA,
  SCHEMA_ORDERS,
  PRODUCT_SCHEMA,
  SCHEMA_PRODUCT,
  WAREHOUSE_SCHEMA,
  SCHEMA_WAREHOUSE,
  tableName,
} = require('@/config/dbSchema');

const ORDER_TABLE = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const STOCK_TABLE = tableName(WAREHOUSE_SCHEMA.PRODUCT_STOCK.TABLE, SCHEMA_WAREHOUSE);
const SERVICES_TABLE = tableName(WAREHOUSE_SCHEMA.STOCK_SERVICES.TABLE, SCHEMA_WAREHOUSE);

async function run() {
  try {
    console.log("=== DB Search for Account: Blaze.Munoz355@outlook.com ===");

    // Find all orders for this email
    const orders = await db(ORDER_TABLE)
      .where('information_order', 'like', '%Blaze.Munoz355%')
      .orderBy('id', 'desc');
    console.log(`\nFound ${orders.length} orders:`);
    console.table(orders.map(o => ({
      id: o.id,
      id_order: o.id_order,
      id_product: o.id_product,
      information_order: o.information_order,
      order_date: o.order_date,
      expired_at: o.expired_at,
      status: o.status,
      price: o.price,
      cost: o.cost
    })));

    // Find all stocks matching this email
    const stocks = await db(STOCK_TABLE)
      .where('account_username', 'like', '%Blaze.Munoz355%');
    console.log(`\nFound ${stocks.length} stock accounts:`);
    for (const stock of stocks) {
      console.log(`Stock ID: ${stock.id} | Account: ${stock.account_username}`);
      const services = await db(SERVICES_TABLE).where({ stock_id: stock.id });
      console.table(services.map(s => ({
        id: s.id,
        expires_at: s.expires_at,
        status: s.status,
        name_id: s.name_id,
        password: s.password_encrypted
      })));
    }

  } catch (err) {
    console.error("Error executing check:", err);
  } finally {
    process.exit(0);
  }
}

run();
