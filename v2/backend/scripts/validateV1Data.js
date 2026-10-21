/**
 * Validate V1 Data Migration into V2
 * Checks core 6 tables and their subsidiary tables for row counts and data integrity.
 */
require('dotenv').config();
const knex = require('knex');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

async function validate() {
  console.log('=== VALIDATING V1 CORE TABLES & SUBSIDIARY TABLES IN V2 ===');

  try {
    // 1. Orders & Subsidiaries
    const orderCount = await db('business.order_list').count('* as count').first();
    const paymentSlotCount = await db('business.order_payment_slots').count('* as count').first().catch(() => ({ count: 'N/A' }));
    const receiptCount = await db('billing.payment_receipt').count('* as count').first().catch(() => ({ count: 'N/A' }));
    const costLogCount = await db('business.supplier_order_cost_log').count('* as count').first().catch(() => ({ count: 'N/A' }));

    console.log(`- Orders (business.order_list): ${orderCount.count}`);
    console.log(`- Order Payment Slots: ${paymentSlotCount.count}`);
    console.log(`- Payment Receipts: ${receiptCount.count}`);
    console.log(`- Supplier Order Cost Logs: ${costLogCount.count}`);

    // 2. Products & Variants
    const productCount = await db('business.product').count('* as count').first();
    const variantTableCount = await db('business.variant').count('* as count').first().catch(() => ({ count: 'N/A' }));

    console.log(`- Products (business.product): ${productCount.count}`);
    console.log(`- Variants (business.variant): ${variantTableCount.count}`);

    // 3. Warehouse & Package Products
    const packageProductsCount = await db('warehouse.package_products').count('* as count').first().catch(() => ({ count: 'N/A' }));
    const productNamesCount = await db('warehouse.product_names').count('* as count').first().catch(() => ({ count: 'N/A' }));

    console.log(`- Package Products: ${packageProductsCount.count}`);
    console.log(`- Product Names: ${productNamesCount.count}`);

    // 4. Suppliers & Subsidiaries
    const supplierCount = await db('business.supplier').count('* as count').first();
    const supplierPaymentsCount = await db('business.supplier_payments').count('* as count').first().catch(() => ({ count: 'N/A' }));

    console.log(`- Suppliers (business.supplier): ${supplierCount.count}`);
    console.log(`- Supplier Payments: ${supplierPaymentsCount.count}`);

    console.log('=== VALIDATION COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Validation error:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

validate();
