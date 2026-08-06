require('module-alias/register');
const { db } = require('../src/db');

async function checkCols() {
  const res = await db.raw(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'business' AND table_name = 'order_list';
  `);
  console.log(res.rows.map(r => r.column_name));
  await db.destroy();
}

checkCols().catch(console.error);
