const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/admin_store',
});

async function main() {
  try {
    const tables = await db.raw(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name;
    `);
    console.log("=== TABLES ===");
    console.log(tables.rows);

    // Check domain_event_store
    const eventCount = await db('system_automation.domain_event_store').count('id as count').first();
    console.log("domain_event_store count:", eventCount);

    const sampleEvents = await db('system_automation.domain_event_store')
      .orderBy('id', 'desc')
      .limit(5);
    console.log("Sample domain_event_store events:", JSON.stringify(sampleEvents, null, 2));

    // Check if receipt schema or tables exist
    const receiptTables = tables.rows.filter(r => r.table_schema === 'receipt' || r.table_name.includes('receipt'));
    console.log("Receipt tables:", receiptTables);

    if (receiptTables.length > 0) {
      for (const t of receiptTables) {
        const fullTableName = `${t.table_schema}.${t.table_name}`;
        const count = await db(fullTableName).count('* as count').first();
        console.log(`Table ${fullTableName} count:`, count);
        const sample = await db(fullTableName).limit(3);
        console.log(`Sample ${fullTableName}:`, sample);
      }
    }

  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await db.destroy();
  }
}

main();
