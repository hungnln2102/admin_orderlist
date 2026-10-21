require('dotenv').config();
const knex = require('knex');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

async function run() {
  console.log('Backfilling receipt allocations from payment_receipt.id_order...');

  const receipts = await db('billing.payment_receipt')
    .whereNotNull('id_order')
    .andWhere('id_order', '!=', '');

  console.log(`Found ${receipts.length} receipts with id_order.`);

  let insertedCount = 0;
  for (const r of receipts) {
    // Check if allocation already exists
    const existing = await db('billing.payment_receipt_allocations')
      .where('receipt_id', r.id)
      .andWhere('target_code', r.id_order)
      .first();

    if (!existing) {
      await db('billing.payment_receipt_allocations').insert({
        receipt_id: r.id,
        allocation_type: 'ORDER',
        target_code: r.id_order,
        amount: r.amount,
        remaining_balance: 0,
        note: r.note || 'Migrated from V1 backup id_order',
        created_by: 'MIGRATION',
      });

      // Update receipt status to FULLY_ALLOCATED and unallocated_amount to 0
      await db('billing.payment_receipt')
        .where('id', r.id)
        .update({
          status: 'FULLY_ALLOCATED',
          unallocated_amount: 0,
        });

      insertedCount++;
    }
  }

  console.log(`Successfully inserted ${insertedCount} receipt allocations and updated receipt statuses.`);
  await db.destroy();
  process.exit(0);
}

run().catch(console.error);
