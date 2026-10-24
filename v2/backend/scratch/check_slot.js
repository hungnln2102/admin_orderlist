require('dotenv').config();
const { db } = require('../src/db');

async function check() {
  try {
    const res = await db.raw(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_schema = 'orders' AND table_name = 'order_list' AND column_name = 'slot';
    `);
    console.log('Column type of slot:', res.rows);

    // Force alter column slot to varchar(255) in mydtbmav
    await db.raw(`ALTER TABLE orders.order_list ALTER COLUMN slot TYPE VARCHAR(255) USING slot::VARCHAR;`);
    console.log('✅ Successfully altered orders.order_list.slot to VARCHAR(255)');

    const resAfter = await db.raw(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_schema = 'orders' AND table_name = 'order_list' AND column_name = 'slot';
    `);
    console.log('Column type after alter:', resAfter.rows);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

check();
