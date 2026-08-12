require('module-alias/register');
const { pool } = require('@/config/database');

async function main() {
  try {
    const res = await pool.query("SELECT id_order, status, expired_at, id_product FROM business.order_list WHERE id_order LIKE 'MAVN%'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
