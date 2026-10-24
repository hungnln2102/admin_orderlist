require('dotenv').config();

const fs = require('fs');
const path = require('path');
const knex = require('knex');

const EXPECTED_TARGET_DATABASES = ['mydtbmav', 'mydtbmav_v2_import'];
const applyChanges = process.argv.includes('--apply');
const resetTarget = process.argv.includes('--reset-target');

const { TABLES } = require('../src/db');

const SOURCE = {
  suppliers: 'business.supplier',
  products: 'business.product',
  variants: 'business.variant',
  variantPrices: 'business.variant_price',
  supplierCosts: 'business.supplier_cost',
  orders: 'business.order_list',
  supplierLogs: 'business.supplier_order_cost_log',
  accounts: 'business.product_keys',
  slots: 'warehouse.stock_services',
  productNames: 'warehouse.product_names',
  packages: 'business.package_product',
};

const TARGET = {
  suppliers: TABLES.SUPPLIER,
  products: TABLES.PRODUCT,
  variants: TABLES.VARIANT,
  variantPrices: TABLES.VARIANT_PRICE,
  supplierCosts: TABLES.SUPPLIER_COST,
  orders: TABLES.ORDER_LIST,
  supplierLogs: TABLES.SUPPLIER_ORDER_COST_LOG,
  accounts: TABLES.PRODUCT_KEYS,
  slots: TABLES.STOCK_SERVICES,
  productNames: TABLES.PRODUCT_NAMES,
  packages: TABLES.PACKAGE_PRODUCT,
};

const STATUS_MAP = new Map([
  ['Hết Hạn', 'EXPIRED'],
  ['Đã Thanh Toán', 'PAID'],
  ['Đã Hoàn', 'REFUNDED'],
  ['Cần Gia Hạn', 'RENEW_REQUIRED'],
  ['Chưa Thanh Toán', 'UNPAID'],
]);

function databaseName(url) {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

function connectionUrl(envName, fallbackDatabase) {
  if (process.env[envName]) return process.env[envName];
  if (!process.env.DATABASE_URL) throw new Error(`${envName} or DATABASE_URL is required.`);
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error(`${envName} is required for a non-local host.`);
  }
  url.pathname = `/${fallbackDatabase}`;
  return url.toString();
}

function assertSafeTarget(url) {
  const name = databaseName(url);
  if (!EXPECTED_TARGET_DATABASES.includes(name) && process.env.ALLOW_UNSAFE_TARGET !== '1') {
    throw new Error(`Refusing write target ${name}; expected one of ${EXPECTED_TARGET_DATABASES.join(', ')}.`);
  }
}

function chunks(rows, size = 250) {
  const result = [];
  for (let index = 0; index < rows.length; index += size) result.push(rows.slice(index, index + size));
  return result;
}

async function upsert(trx, table, rows, conflictColumns) {
  for (const group of chunks(rows)) {
    if (group.length) await trx(table).insert(group).onConflict(conflictColumns).merge();
  }
}

function normalizeSlot(value) {
  const text = String(value ?? '').trim();
  const parsed = Number.parseInt(text, 10);
  return /^\d{19}$/.test(text) || !Number.isInteger(parsed) || parsed < 1 || parsed >= 100000 ? 1 : parsed;
}

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('vi-VN');
}

async function loadSource(sourceDb) {
  const rows = await Promise.all(Object.values(SOURCE).map((table) => sourceDb(table).select('*')));
  return Object.fromEntries(Object.keys(SOURCE).map((name, index) => [name, rows[index]]));
}

async function resetSandbox(targetDb) {
  const schemas = [
    'business', 'billing', 'finance', 'warehouse', 'system_automation', 'admin', 'receipt', 'orders',
    'partner', 'product', 'identity', 'promotion', 'supplier', 'supplier_cost', 'wallet', 'form_desc',
    'inputs', 'renew_adobe',
  ];
  for (const schema of schemas) await targetDb.raw('DROP SCHEMA IF EXISTS ?? CASCADE', [schema]);
  for (const table of ['knex_migrations_v2', 'knex_migrations_v2_lock', 'knex_migrations', 'knex_migrations_lock']) {
    await targetDb.raw('DROP TABLE IF EXISTS public.?? CASCADE', [table]);
  }
  await targetDb.migrate.latest({
    directory: path.resolve(__dirname, '../src/db/migrations'),
    tableName: 'knex_migrations_v2',
  });
}

function createReport(source, sourceDatabase, targetDatabase) {
  return {
    generated_at: new Date().toISOString(),
    source_database: sourceDatabase,
    target_database: targetDatabase,
    mode: applyChanges ? 'apply' : 'dry-run',
    reset_target: resetTarget,
    source_counts: Object.fromEntries(Object.entries(source).map(([name, rows]) => [name, rows.length])),
    imported_counts: {},
    exceptions: { skipped_supplier_costs: [], normalized_order_slots: [], unmapped_package_accounts: [], unmapped_package_slots: [] },
    package_catalog: { created: [], reused: [] },
    validation: {},
  };
}

async function importData(targetDb, source, report) {
  const variantIds = new Set(source.variants.map((row) => String(row.id)));
  const supplierIds = new Set(source.suppliers.map((row) => String(row.id)));
  const orderIds = new Set(source.orders.map((row) => String(row.id)));
  const accountIds = new Set(source.accounts.map((row) => String(row.id)));
  const slotIds = new Set(source.slots.map((row) => String(row.id)));
  const productById = new Map(source.products.map((row) => [String(row.id), row]));

  const supplierCosts = source.supplierCosts.filter((row) => {
    const valid = variantIds.has(String(row.variant_id)) && supplierIds.has(String(row.supplier_id));
    if (!valid) report.exceptions.skipped_supplier_costs.push({
      id: row.id,
      variant_id: row.variant_id,
      supplier_id: row.supplier_id,
      reason: variantIds.has(String(row.variant_id)) ? 'supplier_not_found_in_v1' : 'variant_not_found_in_v1',
    });
    return valid;
  });

  const orders = source.orders.map((row) => {
    const slot = normalizeSlot(row.slot);
    if (/^\d{19}$/.test(String(row.slot ?? '').trim())) {
      report.exceptions.normalized_order_slots.push({ id: row.id, original_slot: row.slot, normalized_slot: slot });
    }
    const status = STATUS_MAP.get(String(row.status || '').trim()) || String(row.status || 'UNPAID').trim();
    return {
      id: row.id, id_order: row.id_order, id_product: row.id_product, information_order: row.information_order,
      customer: row.customer, contact: row.contact, slot, order_date: row.order_date, days: row.days,
      expired_at: row.expired_at, supply_id: supplierIds.has(String(row.supply_id)) ? row.supply_id : null,
      cost: row.cost, price: row.price, note: row.note, status, was_paid: status === 'PAID', refund: row.refund,
      canceled_at: row.canceled_at, gross_selling_price: row.gross_selling_price, transaction: row.transaction,
      payment_method: row.payment_method, usdt_amount_usd: row.usdt_amount_usd,
      usdt_exchange_rate: row.usdt_exchange_rate, usdt_wallet_id: null, created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    };
  });

  const supplierLogs = source.supplierLogs.filter((row) =>
    (!row.order_list_id || orderIds.has(String(row.order_list_id))) && (!row.supply_id || supplierIds.has(String(row.supply_id)))
  );

  await targetDb.transaction(async (trx) => {
    await upsert(trx, TARGET.suppliers, source.suppliers.map((row) => ({
      id: row.id, supplier_name: row.supplier_name, number_bank: row.number_bank, bin_bank: row.bin_bank,
      account_holder: row.account_holder, active_supply: row.active_supply, created_at: row.created_at,
    })), 'id');
    await upsert(trx, TARGET.products, source.products.map((row) => ({
      id: row.id, package_name: row.package_name, is_active: row.is_active,
      package_requires_activation: row.package_requires_activation, image_url: row.image_url,
      created_at: row.created_at, updated_at: row.updated_at || row.created_at,
    })), 'id');
    await upsert(trx, TARGET.variants, source.variants.map((row) => ({
      id: row.id, product_id: row.product_id, variant_name: row.variant_name, display_name: row.display_name,
      base_price: row.base_price, is_active: row.is_active, form_id: row.form_id, image_url: row.image_url,
      id_desc: row.id_desc, created_at: row.created_at, updated_at: row.updated_at || row.created_at,
    })), 'id');
    await upsert(trx, TARGET.variantPrices, source.variantPrices.map((row) => ({
      variant_id: row.variant_id, tier_id: row.tier_id, price: row.price, margin_ratio: row.margin_ratio,
    })), ['variant_id', 'tier_id']);
    await upsert(trx, TARGET.supplierCosts, supplierCosts.map((row) => ({
      id: row.id, variant_id: row.variant_id, supplier_id: row.supplier_id, price: row.price,
      created_at: row.created_at, updated_at: row.updated_at || row.created_at,
    })), ['variant_id', 'supplier_id']);
    await upsert(trx, TARGET.orders, orders, 'id');
    await upsert(trx, TARGET.supplierLogs, supplierLogs.map((row) => ({
      id: row.id, order_list_id: row.order_list_id, supply_id: row.supply_id, id_order: row.id_order,
      import_cost: row.import_cost, refund_amount: row.refund_amount, ncc_payment_status: row.ncc_payment_status,
      logged_at: row.logged_at,
    })), 'id');
    await upsert(trx, TARGET.productNames, source.productNames.map((row) => ({
      id: row.id, name: row.name, description: null, category: null, is_active: true, is_package: false,
      login_url: null, requires_storage: true, created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    })), 'id');
    await upsert(trx, TARGET.accounts, source.accounts.map((row) => ({
      id: row.id, product_name_id: null, account_username: row.account_username || `V1 account ${row.id}`,
      account_identifier: row.account_username || `V1 account ${row.id}`, password: null, key_hint: row.key_hint,
      status: row.status || 'AVAILABLE', id_order: row.id_order,
      note: row.order_list_id ? `V1 order_list_id=${row.order_list_id}` : null,
      created_at: row.created_at, updated_at: row.updated_at || row.created_at,
    })), 'id');
    await upsert(trx, TARGET.slots, source.slots.map((row) => ({
      id: row.id, account_id: row.stock_id, name_id: row.name_id, slot_index: 1, password: row.password_encrypted,
      key_hint: null, backup_email: row.backup_email, two_fa: row.two_fa_encrypted,
      status: row.status || 'AVAILABLE', customer: null, contact: null, id_order: null, days: 30,
      expired_at: row.expires_at, service_note: row.note, created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    })), 'id');

    await trx.raw(`SELECT setval(pg_get_serial_sequence('${TARGET.productNames}', 'id'), COALESCE((SELECT MAX(id) FROM ${TARGET.productNames}), 1), true)`);

    const catalogByName = new Map((await trx(TARGET.productNames).select('id', 'name')).map((row) => [normalizeText(row.name), row]));
    const packageCatalogIds = new Map();
    for (const productId of new Set(source.packages.map((row) => String(row.package_id)))) {
      const product = productById.get(productId);
      const name = product?.package_name || `V1 package ${productId}`;
      const existing = catalogByName.get(normalizeText(name));
      if (existing) {
        packageCatalogIds.set(productId, existing.id);
        report.package_catalog.reused.push({ product_id: productId, product_name_id: existing.id, name });
        continue;
      }
      const [created] = await trx(TARGET.productNames).insert({
        name, is_active: product?.is_active ?? true, is_package: true,
        requires_storage: source.packages.some((row) => String(row.package_id) === productId && row.storage_id),
        created_at: product?.created_at || trx.fn.now(), updated_at: product?.updated_at || product?.created_at || trx.fn.now(),
      }).returning(['id', 'name']);
      catalogByName.set(normalizeText(created.name), created);
      packageCatalogIds.set(productId, created.id);
      report.package_catalog.created.push({ product_id: productId, product_name_id: created.id, name });
    }
    const packageRows = source.packages.map((row) => {
      const accountId = accountIds.has(String(row.stock_id)) ? row.stock_id : null;
      const storageAccountId = row.storage_id && accountIds.has(String(row.storage_id)) ? row.storage_id : null;
      const slotId = row.stock_service_id && slotIds.has(String(row.stock_service_id)) ? row.stock_service_id : null;
      if (row.stock_id && !accountId) report.exceptions.unmapped_package_accounts.push({ id: row.id, stock_id: row.stock_id });
      if (row.stock_service_id && !slotId) report.exceptions.unmapped_package_slots.push({ id: row.id, stock_service_id: row.stock_service_id });
      return {
        id: row.id, product_name_id: packageCatalogIds.get(String(row.package_id)) || null,
        package_name: productById.get(String(row.package_id))?.package_name || null,
        account_id: accountId, storage_account_id: storageAccountId, supplier: row.supplier || 'Mavryk',
        cost: row.cost, slot: normalizeSlot(row.slot), storage_total: row.storage_total == null ? null : String(row.storage_total),
        match_rule: row.match || 'slot', package_note: slotId ? `V1 stock_service_id=${slotId}` : null,
        created_at: trx.fn.now(), updated_at: trx.fn.now(),
      };
    });
    await upsert(trx, TARGET.packages, packageRows, 'id');
    for (const table of [
      TARGET.suppliers, TARGET.products, TARGET.variants, TARGET.supplierCosts, TARGET.orders,
      TARGET.supplierLogs, TARGET.productNames, TARGET.accounts, TARGET.slots, TARGET.packages,
    ]) {
      await trx.raw(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`);
    }
    report.imported_counts = {
      suppliers: source.suppliers.length, products: source.products.length, variants: source.variants.length,
      variant_prices: source.variantPrices.length, supplier_costs: supplierCosts.length, orders: orders.length,
      supplier_order_cost_logs: supplierLogs.length, warehouse_product_names: source.productNames.length + report.package_catalog.created.length,
      warehouse_accounts: source.accounts.length, warehouse_account_slots: source.slots.length,
      warehouse_package_products: packageRows.length,
    };
  });
}

async function validateTarget(sourceDb, targetDb, report) {
  const count = async (table) => Number((await targetDb(table).count('* as count').first()).count);
  report.validation.counts = {
    suppliers: await count(TARGET.suppliers), products: await count(TARGET.products), variants: await count(TARGET.variants),
    variant_prices: await count(TARGET.variantPrices), supplier_costs: await count(TARGET.supplierCosts),
    orders: await count(TARGET.orders), supplier_order_cost_logs: await count(TARGET.supplierLogs),
    warehouse_product_names: await count(TARGET.productNames), warehouse_accounts: await count(TARGET.accounts),
    warehouse_account_slots: await count(TARGET.slots), warehouse_package_products: await count(TARGET.packages),
    admin_users: await count('admin.users'),
  };
  const checks = {
    supplier_cost_missing_variant: `SELECT COUNT(*)::int AS count FROM ${TARGET.supplierCosts} sc LEFT JOIN ${TARGET.variants} v ON v.id = sc.variant_id WHERE v.id IS NULL`,
    supplier_cost_missing_supplier: `SELECT COUNT(*)::int AS count FROM ${TARGET.supplierCosts} sc LEFT JOIN ${TARGET.suppliers} s ON s.id = sc.supplier_id WHERE s.id IS NULL`,
    supplier_log_missing_order: `SELECT COUNT(*)::int AS count FROM ${TARGET.supplierLogs} l LEFT JOIN ${TARGET.orders} o ON o.id = l.order_list_id WHERE l.order_list_id IS NOT NULL AND o.id IS NULL`,
    supplier_log_missing_supplier: `SELECT COUNT(*)::int AS count FROM ${TARGET.supplierLogs} l LEFT JOIN ${TARGET.suppliers} s ON s.id = l.supply_id WHERE l.supply_id IS NOT NULL AND s.id IS NULL`,
    slot_missing_account: `SELECT COUNT(*)::int AS count FROM ${TARGET.slots} s LEFT JOIN ${TARGET.accounts} a ON a.id = s.account_id WHERE s.account_id IS NOT NULL AND a.id IS NULL`,
    slot_missing_name: `SELECT COUNT(*)::int AS count FROM ${TARGET.slots} s LEFT JOIN ${TARGET.productNames} n ON n.id = s.name_id WHERE s.name_id IS NOT NULL AND n.id IS NULL`,
    package_missing_account: `SELECT COUNT(*)::int AS count FROM ${TARGET.packages} p LEFT JOIN ${TARGET.accounts} a ON a.id = p.account_id WHERE p.account_id IS NOT NULL AND a.id IS NULL`,
    package_missing_storage: `SELECT COUNT(*)::int AS count FROM ${TARGET.packages} p LEFT JOIN ${TARGET.accounts} a ON a.id = p.storage_account_id WHERE p.storage_account_id IS NOT NULL AND a.id IS NULL`,
    package_missing_name: `SELECT COUNT(*)::int AS count FROM ${TARGET.packages} p LEFT JOIN ${TARGET.productNames} n ON n.id = p.product_name_id WHERE p.product_name_id IS NOT NULL AND n.id IS NULL`,
  };
  report.validation.integrity = {};
  for (const [name, sql] of Object.entries(checks)) report.validation.integrity[name] = Number((await targetDb.raw(sql)).rows[0].count);
  const sourceTotals = await sourceDb(SOURCE.orders).sum({ price: 'price', cost: 'cost' }).first();
  const targetTotals = await targetDb(TARGET.orders).sum({ price: 'price', cost: 'cost' }).first();
  report.validation.order_totals = { source: sourceTotals, target: targetTotals };
}

function writeReport(report) {
  const directory = path.resolve(__dirname, '../reports');
  fs.mkdirSync(directory, { recursive: true });
  const reportPath = path.join(directory, `v1-operational-import-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return reportPath;
}

async function main() {
  const sourceUrl = connectionUrl('V1_DATABASE_URL', 'mydtbmav_v1_restore');
  const targetUrl = connectionUrl('V2_IMPORT_DATABASE_URL', EXPECTED_TARGET_DATABASE);
  assertSafeTarget(targetUrl);
  const sourceDb = knex({ client: 'pg', connection: sourceUrl });
  const targetDb = knex({ client: 'pg', connection: targetUrl });
  try {
    const source = await loadSource(sourceDb);
    const report = createReport(source, databaseName(sourceUrl), databaseName(targetUrl));
    console.log(`[V1 import] source=${report.source_database}, target=${report.target_database}, mode=${report.mode}`);
    console.table(report.source_counts);
    if (!applyChanges) {
      console.log(`[V1 import] dry-run complete; no data written; report=${writeReport(report)}`);
      return;
    }
    if (resetTarget) {
      console.log('[V1 import] resetting target sandbox');
      await resetSandbox(targetDb);
    }
    await importData(targetDb, source, report);
    await validateTarget(sourceDb, targetDb, report);
    const reportPath = writeReport(report);
    if (Object.values(report.validation.integrity).some((count) => count !== 0)) {
      throw new Error(`Integrity validation failed; see ${reportPath}`);
    }
    console.log(`[V1 import] completed successfully; report=${reportPath}`);
  } finally {
    await Promise.all([sourceDb.destroy(), targetDb.destroy()]);
  }
}

main().catch((error) => {
  console.error('[V1 import] failed:', error.message);
  process.exitCode = 1;
});
