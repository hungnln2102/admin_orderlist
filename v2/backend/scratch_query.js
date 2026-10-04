require('dotenv').config();
const { db, TABLES } = require('./src/db');

async function run() {
  try {
    const events = await db(TABLES.DOMAIN_EVENT_STORE)
      .whereIn('event_name', ['WEBHOOK_MONEY_IN', 'WEBHOOK_MONEY_OUT'])
      .orderBy('id', 'desc')
      .limit(5);

    console.log('=== WEBHOOK EVENTS COUNT ===', events.length);
    console.log(JSON.stringify(events, null, 2));

    const totalEvents = await db(TABLES.DOMAIN_EVENT_STORE).count('id as count').first();
    console.log('=== TOTAL DOMAIN EVENTS ===', totalEvents);

    const tables = await db.raw(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `);
    console.log('=== DB TABLES ===');
    console.log(tables.rows.map(r => `${r.table_schema}.${r.table_name}`));

    // Check if receipt schema table exists
    const receiptTables = tables.rows.filter(r => r.table_name.includes('receipt'));
    console.log('=== RECEIPT TABLES ===', receiptTables);
    for (const t of receiptTables) {
      const full = `${t.table_schema}.${t.table_name}`;
      const count = await db(full).count('* as count').first();
      console.log(`Count ${full}:`, count);
      const sample = await db(full).limit(3);
      console.log(`Sample ${full}:`, sample);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
