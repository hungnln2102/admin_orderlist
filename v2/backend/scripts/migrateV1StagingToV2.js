/**
 * Migrate V1 Staging Data to V2 Physical Database
 */
require('dotenv').config();
const knex = require('knex');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USER = process.env.DB_USER || 'admin';
const DB_PASS = process.env.DB_PASS;

if (!DB_PASS) throw new Error('DB_PASS is required.');

const v1Db = knex({
  client: 'pg',
  connection: {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: 'mydtbmav_v1',
  },
});

const v2Db = knex({
  client: 'pg',
  connection: {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: 'mydtbmav',
  },
});

async function runMigrate() {
  console.log('=== STARTING V1 STAGING TO V2 ETL MIGRATION ===');

  try {
    const findV1TableData = async (possibleSchemas, tableName) => {
      for (const sch of possibleSchemas) {
        try {
          const rows = await v1Db(`${sch}.${tableName}`).select('*');
          if (rows && rows.length > 0) return rows;
        } catch {}
      }
      return [];
    };

    const schemas = ['business', 'billing', 'warehouse', 'public', 'finance'];

    // 1. Migrate Warehouse Accounts (product_keys)
    console.log('\n--- 1. ETL Warehouse Accounts ---');
    const productKeys = await findV1TableData(schemas, 'product_keys');
    console.log(`Found ${productKeys.length} product_keys in V1.`);
    let accountsCount = 0;
    for (const pk of productKeys) {
      const exists = await v2Db('warehouse.accounts').where('id', pk.id).first();
      if (!exists) {
        const username = pk.account_username || pk.account || pk.account_identifier || `Account #${pk.id}`;
        await v2Db('warehouse.accounts').insert({
          id: pk.id,
          account_username: username,
          account_identifier: username,
          password: pk.password || pk.key_hint || null,
          key_hint: pk.key_hint || null,
          status: pk.status || 'AVAILABLE',
          id_order: pk.id_order || null,
          note: pk.id_order ? `Order: ${pk.id_order}` : (pk.note || null),
          created_at: pk.created_at || new Date(),
          updated_at: pk.updated_at || new Date(),
        }).onConflict('id').ignore();
        accountsCount++;
      }
    }
    console.log(`Migrated ${accountsCount} warehouse accounts.`);

    // 2. Migrate Warehouse Account Slots (stock_services)
    console.log('\n--- 2. ETL Warehouse Account Slots ---');
    const stockServices = await findV1TableData(schemas, 'stock_services');
    console.log(`Found ${stockServices.length} stock_services in V1.`);
    let slotsCount = 0;
    for (const ss of stockServices) {
      const exists = await v2Db('warehouse.account_slots').where('id', ss.id).first();
      if (!exists) {
        let nameId = ss.name_id;
        if (nameId) {
          const nameExists = await v2Db('warehouse.product_names').where('id', nameId).first();
          if (!nameExists) {
            await v2Db('warehouse.product_names').insert({
              id: nameId,
              name: `Dịch vụ #${nameId}`,
            }).onConflict('id').ignore();
          }
        }

        // Ensure account_id exists in warehouse.accounts
        let accountId = ss.stock_id;
        if (accountId) {
          const accExists = await v2Db('warehouse.accounts').where('id', accountId).first();
          if (!accExists) {
            await v2Db('warehouse.accounts').insert({
              id: accountId,
              account_username: `Account #${accountId}`,
              status: 'AVAILABLE',
            }).onConflict('id').ignore();
          }
        }

        await v2Db('warehouse.account_slots').insert({
          id: ss.id,
          account_id: accountId || null,
          name_id: nameId || null,
          password: ss.password_encrypted || ss.password || null,
          backup_email: ss.backup_email || null,
          two_fa: ss.two_fa_encrypted || ss.two_fa || null,
          expires_at: ss.expires_at || null,
          status: ss.status || 'AVAILABLE',
          service_note: ss.note || null,
          slot_index: ss.slot_index || 1,
          assigned_order_id: ss.assigned_order_id || null,
          created_at: ss.created_at || new Date(),
          updated_at: ss.updated_at || new Date(),
        }).onConflict('id').ignore();
        slotsCount++;
      }
    }
    console.log(`Migrated ${slotsCount} warehouse account slots.`);

    // 3. Migrate Package Products (package_product)
    console.log('\n--- 3. ETL Package Products ---');
    const packageProductsV1 = await findV1TableData(schemas, 'package_product');
    console.log(`Found ${packageProductsV1.length} package_product rows in V1.`);
    let packagesCount = 0;
    for (const pp of packageProductsV1) {
      const exists = await v2Db('warehouse.package_products').where('id', pp.id).first();
      if (!exists) {
        let pNameId = pp.package_id || pp.product_name_id;
        if (pNameId) {
          const pnExists = await v2Db('warehouse.product_names').where('id', pNameId).first();
          if (!pnExists) {
            await v2Db('warehouse.product_names').insert({
              id: pNameId,
              name: `Gói sản phẩm #${pNameId}`,
            }).onConflict('id').ignore();
          }
        }

        let accountId = pp.stock_service_id || pp.account_id || null;
        if (accountId) {
          const accExists = await v2Db('warehouse.accounts').where('id', accountId).first();
          if (!accExists) {
            await v2Db('warehouse.accounts').insert({
              id: accountId,
              account_username: `Account #${accountId}`,
              status: 'AVAILABLE',
            }).onConflict('id').ignore();
          }
        }

        let storageAccId = pp.storage_id || pp.storage_account_id || null;
        if (storageAccId) {
          const sAccExists = await v2Db('warehouse.accounts').where('id', storageAccId).first();
          if (!sAccExists) {
            await v2Db('warehouse.accounts').insert({
              id: storageAccId,
              account_username: `Storage Account #${storageAccId}`,
              status: 'AVAILABLE',
            }).onConflict('id').ignore();
          }
        }

        await v2Db('warehouse.package_products').insert({
          id: pp.id,
          product_name_id: pNameId || null,
          account_id: accountId || null,
          storage_account_id: storageAccId || null,
          supplier: pp.supplier || 'Mavryk',
          cost: pp.cost || 0,
          slot: pp.slot || 2,
          storage_total: pp.storage_total || 0,
          match_rule: pp.match || pp.match_rule || 'slot',
          package_note: pp.note || pp.package_note || null,
          created_at: pp.created_at || new Date(),
          updated_at: pp.updated_at || new Date(),
        }).onConflict('id').ignore();
        packagesCount++;
      }
    }
    console.log(`Migrated ${packagesCount} package products.`);

    console.log('\n=== V1 STAGING TO V2 ETL COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('ETL Migration Error:', err);
    throw err;
  } finally {
    await v1Db.destroy();
    await v2Db.destroy();
  }
}

runMigrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
