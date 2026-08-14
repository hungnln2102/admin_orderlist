require('module-alias/register');
const { pool } = require('@/config/database');

async function main() {
  try {
    const res = await pool.query(`SELECT * FROM business.pricing_tier`);
    console.log("Pricing Tiers in DB:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
