const { Client } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const res = await client.query(
      "SELECT id_order, price, status, payment_method FROM business.order_list WHERE id_order = $1",
      ["MAVL8RGQ8"]
    );
    console.log("Order Data:", JSON.stringify(res.rows, null, 2));
  } finally {
    await client.end();
  }
}

main().catch(console.error);
