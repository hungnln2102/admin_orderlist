require('dotenv').config({ path: './v2/backend/.env' });
require('module-alias').addAlias('@', __dirname + '/v2/backend/src');

const { db, TABLES } = require('./v2/backend/src/db');

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

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
