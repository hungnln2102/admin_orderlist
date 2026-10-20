/**
 * System-Wide V1 to V2 Data Migration & ETL Script
 * Permanently migrates V1 backup data into V2 physical tables.
 */
require('dotenv').config();
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://admin:ZAQ!xsw21122@127.0.0.1:5432/mydtbmav',
});

async function runETL() {
  console.log('=== STARTING SYSTEM-WIDE V1 TO V2 ETL MIGRATION ===');

  try {
    // 1. Normalize Order Statuses
    console.log('\n--- 1. Normalizing Order Statuses ---');
    const r1 = await db('business.order_list').where('status', 'LIKE', '%Hết Hạn%').update({ status: 'EXPIRED' });
    const r2 = await db('business.order_list').where('status', 'LIKE', '%Chưa Thanh Toán%').update({ status: 'UNPAID' });
    const r3 = await db('business.order_list').where('status', 'LIKE', '%Đã Hoàn%').update({ status: 'REFUNDED' });
    const r4 = await db('business.order_list').where('status', 'LIKE', '%Đã Thanh Toán%').update({ status: 'PAID' });
    const r5 = await db('business.order_list').where('status', 'LIKE', '%Cần Gia Hạn%').update({ status: 'RENEW_REQUIRED' });
    console.log(`Updated order statuses: EXPIRED(${r1}), UNPAID(${r2}), REFUNDED(${r3}), PAID(${r4}), RENEW_REQUIRED(${r5})`);

    // 2. Backfill Receipt Allocations
    console.log('\n--- 2. Backfilling Receipt Allocations ---');
    const receipts = await db('billing.payment_receipt').whereNotNull('id_order').andWhere('id_order', '!=', '');
    console.log(`Found ${receipts.length} receipts with id_order.`);

    let allocCount = 0;
    for (const r of receipts) {
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
          note: r.note || 'System-wide ETL migration',
          created_by: 'MIGRATION',
        });

        await db('billing.payment_receipt')
          .where('id', r.id)
          .update({
            status: 'FULLY_ALLOCATED',
            unallocated_amount: 0,
          });

        allocCount++;
      }
    }
    console.log(`Inserted ${allocCount} receipt allocations.`);

    // 3. ETL Warehouse Accounts (from business.product_keys)
    console.log('\n--- 3. ETL Warehouse Accounts ---');
    const productKeys = await db('business.product_keys').select('*');
    let accountsCount = 0;
    for (const pk of productKeys) {
      const exists = await db('warehouse.accounts').where('id', pk.id).first();
      if (!exists) {
        await db('warehouse.accounts').insert({
          id: pk.id,
          product_name_id: null,
          account_identifier: pk.account_username || `Account #${pk.id}`,
          password: pk.key_hint || null,
          status: pk.status || 'AVAILABLE',
          note: pk.id_order ? `Order: ${pk.id_order}` : null,
          created_at: pk.created_at || new Date(),
          updated_at: pk.updated_at || new Date(),
        }).onConflict('id').ignore();
        accountsCount++;
      }
    }
    console.log(`Migrated ${accountsCount} warehouse accounts.`);

    // 4. ETL Warehouse Account Slots (from warehouse.stock_services)
    console.log('\n--- 4. ETL Warehouse Account Slots ---');
    const stockServices = await db('warehouse.stock_services').select('*');
    let slotsCount = 0;
    for (const ss of stockServices) {
      const exists = await db('warehouse.account_slots').where('id', ss.id).first();
      if (!exists) {
        await db('warehouse.account_slots').insert({
          id: ss.id,
          account_id: ss.stock_id,
          name_id: ss.name_id,
          password: ss.password_encrypted,
          backup_email: ss.backup_email || null,
          two_fa: ss.two_fa_encrypted || null,
          expires_at: ss.expires_at || null,
          status: ss.status || 'AVAILABLE',
          service_note: ss.note || null,
          created_at: ss.created_at || new Date(),
          updated_at: ss.updated_at || new Date(),
        }).onConflict('id').ignore();
        slotsCount++;
      }
    }
    console.log(`Migrated ${slotsCount} warehouse account slots.`);

    // 5. ETL Package Products (from business.package_product)
    console.log('\n--- 5. ETL Package Products ---');
    const packageProductsV1 = await db('business.package_product').select('*');
    let packagesCount = 0;
    for (const pp of packageProductsV1) {
      const exists = await db('warehouse.package_products').where('id', pp.id).first();
      if (!exists) {
        await db('warehouse.package_products').insert({
          id: pp.id,
          product_name_id: pp.package_id,
          account_id: pp.stock_service_id,
          storage_account_id: pp.storage_id || null,
          supplier: pp.supplier || 'Mavryk',
          cost: pp.cost || 0,
          slot: pp.slot || 2,
          storage_total: pp.storage_total || 0,
          match_rule: pp.match || 'slot',
          package_note: null,
          created_at: new Date(),
          updated_at: new Date(),
        }).onConflict('id').ignore();
        packagesCount++;
      }
    }
    console.log(`Migrated ${packagesCount} package products.`);

    console.log('\n=== SYSTEM-WIDE V1 TO V2 ETL COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('ETL Migration Error:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

runETL();
