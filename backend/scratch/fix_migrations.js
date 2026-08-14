require('module-alias/register');
const { db } = require('../src/db');

const mapping = {
  '20260817120000_supplier_order_cost_log_app_managed_guard.js': '20260805113000_supplier_order_cost_log_app_managed_guard.js',
  '20260820120000_order_list_transaction.js': '20260805120000_order_list_transaction.js',
  '20260820130000_shop_bank_accounts.js': '20260805130000_shop_bank_accounts.js',
  '20260821120000_shop_bank_accounts_total_withdrawn.js': '20260805140000_shop_bank_accounts_total_withdrawn.js',
  '20260821140000_shop_bank_account_ledger.js': '20260805150000_shop_bank_account_ledger.js',
  '20260821150000_supplier_payments_shop_bank_account.js': '20260805160000_supplier_payments_shop_bank_account.js',
  '20260823120000_order_payment_slots.js': '20260805120000_order_payment_slots.js',
  '20260829120000_usdt_wallets.js': '20260805170000_usdt_wallets.js',
  '20260829120100_order_list_payment_method.js': '20260805180000_order_list_payment_method.js',
  '20260831120000_refund_credit_notes_off_flow_source.js': '20260805190000_refund_credit_notes_off_flow_source.js',
  '20261017120000_import_package_rules.js': '20260805191000_import_package_rules.js',
  '20261018120000_receipt_flow_classification.js': '20260804110000_receipt_flow_classification.js',
  '20261103010000_add_is_deleted_to_shop_bank_accounts.js': '20260805141000_add_is_deleted_to_shop_bank_accounts.js'
};

async function main() {
  try {
    console.log("Starting migration renaming in database...");
    
    // Check if the table knex_migrations exists
    const exists = await db.schema.withSchema('public').hasTable('knex_migrations');
    if (!exists) {
      throw new Error("Table public.knex_migrations does not exist!");
    }

    let updatedCount = 0;
    for (const [oldName, newName] of Object.entries(mapping)) {
      const record = await db('public.knex_migrations').where({ name: oldName }).first();
      if (record) {
        console.log(`Found migration to rename: ${oldName} -> ${newName}`);
        await db('public.knex_migrations')
          .where({ name: oldName })
          .update({ name: newName });
        updatedCount++;
      } else {
        console.log(`Migration not found or already renamed: ${oldName}`);
      }
    }
    console.log(`Renaming complete. Updated ${updatedCount} records.`);
  } catch (err) {
    console.error("Error updating migrations:", err);
  } finally {
    await db.destroy();
  }
}

main();
