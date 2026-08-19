const { Client } = require("pg");

const databaseUrl = "postgresql://admin:ZAQ!xsw21122@110.172.28.206:5432/mydtbmav";

async function run() {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log("Connected to remote DB");
    
    // Find order
    const orderRes = await client.query(
      `SELECT * FROM business.order_list WHERE id_order = 'MAVL96UIZ'`
    );
    console.log("Order details:", orderRes.rows);

    if (orderRes.rows.length > 0) {
      const order = orderRes.rows[0];
      const variantRes = await client.query(
        `SELECT * FROM business.variant WHERE id = $1`,
        [order.id_product]
      );
      console.log("Variant details:", variantRes.rows);
      
      const productRes = await client.query(
        `SELECT * FROM business.product WHERE id = $1`,
        [variantRes.rows[0]?.product_id]
      );
      console.log("Product details:", productRes.rows);
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

run();
