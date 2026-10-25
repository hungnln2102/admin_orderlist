require('dotenv').config();
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const knex = require('knex');

const EXPECTED_TARGET_DATABASES = ['mydtbmav', 'mydtbmav_v2_import', 'mydtbmav_prod'];
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
  dailySummary: TABLES.DAILY_REVENUE_SUMMARY,
  systemConfigs: TABLES.SYSTEM_CONFIGS,
  shopBankAccounts: TABLES.SHOP_BANK_ACCOUNTS,
};

const STATUS_MAP = new Map([
  ['Hết Hạn', 'EXPIRED'],
  ['Đã Thanh Toán', 'PAID'],
  ['Đã Hoàn', 'REFUNDED'],
  ['Đã Hoàn Tiền', 'REFUNDED'],
  ['Cần Gia Hạn', 'RENEW_REQUIRED'],
  ['Chưa Thanh Toán', 'UNPAID'],
  ['EXPIRED', 'EXPIRED'],
  ['PAID', 'PAID'],
  ['REFUNDED', 'REFUNDED'],
  ['RENEW_REQUIRED', 'RENEW_REQUIRED'],
  ['UNPAID', 'UNPAID'],
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

/**
 * Giữ nguyên vẹn chuỗi text slot gốc từ V1 (chống ép số, chống null sai)
 */
function normalizeOrderSlot(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function normalizePackageSlot(value) {
  const text = String(value ?? '').trim();
  const parsed = Number.parseInt(text, 10);
  return /^\d{19}$/.test(text) || !Number.isInteger(parsed) || parsed < 1 || parsed >= 100000 ? 1 : parsed;
}

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('vi-VN');
}

/**
 * Chuẩn hóa múi giờ giữ nguyên con số ngày giờ hiển thị (Wall-clock time theo giờ VN)
 * Ví dụ: 2026-10-24 17:00:00 UTC -> 2026-10-24 17:00:00+07
 */
function keepWallTimeAsVietnam(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return `${trimmed} 00:00:00+07`;
    }
    const matchFull = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
    if (matchFull) {
      return `${matchFull[1]} ${matchFull[2]}+07`;
    }
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const sec = String(d.getUTCSeconds()).padStart(2, '0');

  return `${y}-${m}-${day} ${h}:${min}:${sec}+07`;
}

/**
 * Chuyển ngày bất kỳ về mốc 00:00:00 theo múi giờ Việt Nam
 */
function parseVietnamDateToMidnight(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === 'string') {
    const match = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0);
    }
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  // Lấy mốc ngày theo giờ Việt Nam (+7)
  const vnTime = new Date(d.getTime() + 7 * 3600 * 1000);
  return new Date(vnTime.getUTCFullYear(), vnTime.getUTCMonth(), vnTime.getUTCDate(), 0, 0, 0);
}

function getVietnamTodayMidnight() {
  const now = new Date();
  const vnNow = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60 * 1000);
  return new Date(vnNow.getFullYear(), vnNow.getMonth(), vnNow.getDate(), 0, 0, 0);
}

/**
 * Tự động tính toán trạng thái đơn hàng theo ngày hết hạn (Dynamic Status Resolution)
 * - Đã hoàn tiền / Chưa thanh toán: giữ nguyên
 * - Quá hạn (< 0 ngày): EXPIRED
 * - Cận hạn (0 đến warnDays ngày): RENEW_REQUIRED
 * - Còn hạn (> warnDays ngày): PAID
 */
function determineOrderStatus(rawStatus, expiredAtInput, refundInput, todayMidnight, warnDays = 4) {
  const statusStr = String(rawStatus || '').trim();

  if (['Đã Hoàn Tiền', 'Đã Hoàn', 'REFUNDED'].includes(statusStr) || (refundInput != null && Number(refundInput) > 0)) {
    return 'REFUNDED';
  }
  if (['Chưa Thanh Toán', 'UNPAID'].includes(statusStr)) {
    return 'UNPAID';
  }
  if (['Đã Hủy', 'CANCELED', 'CANCELLED'].includes(statusStr)) {
    return 'REFUNDED';
  }

  if (!expiredAtInput) {
    return STATUS_MAP.get(statusStr) || 'PAID';
  }

  const expDate = parseVietnamDateToMidnight(expiredAtInput);
  if (!expDate) {
    return STATUS_MAP.get(statusStr) || 'PAID';
  }

  const diffMs = expDate.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (24 * 3600 * 1000));

  if (diffDays < 0) {
    return 'EXPIRED';
  }
  if (diffDays <= warnDays) {
    return 'RENEW_REQUIRED';
  }
  return 'PAID';
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
    status_distribution: {},
    slot_summary: {},
    exceptions: { skipped_supplier_costs: [], normalized_order_slots: [], unmapped_package_accounts: [], unmapped_package_slots: [] },
    package_catalog: { created: [], reused: [] },
    validation: {},
  };
}

async function syncDailyRevenueSummary(trx) {
  console.log('🔄 [ETL] Đang tự động đồng bộ bảng finance.daily_revenue_summary...');
  const upsertSql = `
    WITH order_dates AS (
      SELECT
        id,
        id_order,
        status,
        price,
        gross_selling_price,
        cost,
        refund,
        COALESCE(
          (order_date AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
          (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        ) AS v_date
      FROM ${TARGET.orders}
      WHERE order_date IS NOT NULL OR created_at IS NOT NULL
    ),
    sales_daily AS (
      SELECT
        v_date,
        COUNT(*) FILTER (WHERE status IN ('PAID', 'EXPIRED', 'RENEW_REQUIRED'))::integer AS sales_orders_count,
        COUNT(*) FILTER (WHERE status = 'REFUNDED')::integer AS canceled_count,
        COALESCE(SUM(COALESCE(gross_selling_price, price, 0)) FILTER (WHERE status IN ('PAID', 'EXPIRED', 'RENEW_REQUIRED')), 0)::numeric AS earned_revenue,
        COALESCE(SUM(COALESCE(cost, 0)) FILTER (WHERE status IN ('PAID', 'EXPIRED', 'RENEW_REQUIRED')), 0)::numeric AS sales_cost,
        COALESCE(SUM(COALESCE(refund, price, 0)) FILTER (WHERE status = 'REFUNDED'), 0)::numeric AS revenue_reversed
      FROM order_dates
      WHERE id_order NOT LIKE 'MAVN%'
      GROUP BY v_date
    ),
    import_daily AS (
      SELECT
        v_date,
        COUNT(*)::integer AS import_count,
        COALESCE(SUM(COALESCE(cost, price, 0)), 0)::numeric AS import_cost
      FROM order_dates
      WHERE id_order LIKE 'MAVN%'
      GROUP BY v_date
    ),
    all_dates AS (
      SELECT v_date FROM sales_daily
      UNION
      SELECT v_date FROM import_daily
    ),
    daily_merged AS (
      SELECT
        ad.v_date AS summary_date,
        COALESCE(s.sales_orders_count, 0) AS dashboard_orders_count,
        COALESCE(s.sales_orders_count, 0) AS total_orders,
        COALESCE(s.canceled_count, 0) AS dashboard_canceled_count,
        ROUND(COALESCE(s.earned_revenue, 0), 2) AS earned_revenue,
        ROUND(COALESCE(s.earned_revenue, 0), 2) AS total_revenue,
        ROUND(COALESCE(s.sales_cost, 0) + COALESCE(imp.import_cost, 0), 2) AS total_shop_cost,
        ROUND(COALESCE(s.sales_cost, 0) + COALESCE(imp.import_cost, 0), 2) AS total_cost,
        ROUND(COALESCE(s.revenue_reversed, 0), 2) AS revenue_reversed,
        ROUND(
          COALESCE(s.earned_revenue, 0) - (COALESCE(s.sales_cost, 0) + COALESCE(imp.import_cost, 0)) - COALESCE(s.revenue_reversed, 0),
          2
        ) AS net_profit
      FROM all_dates ad
      LEFT JOIN sales_daily s ON s.v_date = ad.v_date
      LEFT JOIN import_daily imp ON imp.v_date = ad.v_date
    )
    INSERT INTO ${TARGET.dailySummary} (
      summary_date,
      total_orders,
      total_revenue,
      total_cost,
      net_profit,
      earned_revenue,
      total_shop_cost,
      revenue_reversed,
      dashboard_orders_count,
      dashboard_canceled_count,
      created_at,
      updated_at
    )
    SELECT
      m.summary_date,
      m.total_orders,
      m.total_revenue,
      m.total_cost,
      m.net_profit,
      m.earned_revenue,
      m.total_shop_cost,
      m.revenue_reversed,
      m.dashboard_orders_count,
      m.dashboard_canceled_count,
      NOW(),
      NOW()
    FROM daily_merged m
    WHERE m.summary_date IS NOT NULL
    ON CONFLICT (summary_date) DO UPDATE SET
      total_orders = EXCLUDED.total_orders,
      total_revenue = EXCLUDED.total_revenue,
      total_cost = EXCLUDED.total_cost,
      net_profit = EXCLUDED.net_profit,
      earned_revenue = EXCLUDED.earned_revenue,
      total_shop_cost = EXCLUDED.total_shop_cost,
      revenue_reversed = EXCLUDED.revenue_reversed,
      dashboard_orders_count = EXCLUDED.dashboard_orders_count,
      dashboard_canceled_count = EXCLUDED.dashboard_canceled_count,
      updated_at = NOW();
  `;
  await trx.raw(upsertSql);
  const countRow = await trx(TARGET.dailySummary).count('* as count').first();
  console.log(`✅ [ETL] Đã đồng bộ thành công ${countRow.count} ngày vào finance.daily_revenue_summary.`);
}

async function importData(targetDb, sourceDb, source, report) {
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

  const todayMidnight = getVietnamTodayMidnight();
  const statusStats = { EXPIRED: 0, RENEW_REQUIRED: 0, PAID: 0, REFUNDED: 0, UNPAID: 0 };
  let slotWithTextCount = 0;

  const orders = source.orders.map((row) => {
    const slot = normalizeOrderSlot(row.slot);
    if (slot != null) slotWithTextCount++;

    const status = determineOrderStatus(row.status, row.expired_at, row.refund, todayMidnight, 4);
    statusStats[status] = (statusStats[status] || 0) + 1;

    return {
      id: row.id,
      id_order: row.id_order,
      id_product: row.id_product,
      information_order: row.information_order,
      customer: row.customer,
      contact: row.contact,
      slot,
      order_date: keepWallTimeAsVietnam(row.order_date),
      days: row.days,
      expired_at: keepWallTimeAsVietnam(row.expired_at),
      supply_id: supplierIds.has(String(row.supply_id)) ? row.supply_id : null,
      cost: row.cost,
      price: row.price,
      note: row.note,
      status,
      was_paid: ['PAID', 'RENEW_REQUIRED', 'EXPIRED'].includes(status),
      refund: row.refund,
      canceled_at: keepWallTimeAsVietnam(row.canceled_at),
      gross_selling_price: row.gross_selling_price,
      transaction: row.transaction,
      payment_method: row.payment_method,
      usdt_amount_usd: row.usdt_amount_usd,
      usdt_exchange_rate: row.usdt_exchange_rate,
      usdt_wallet_id: null,
      created_at: keepWallTimeAsVietnam(row.created_at),
      updated_at: keepWallTimeAsVietnam(row.updated_at || row.created_at),
    };
  });

  report.status_distribution = statusStats;
  report.slot_summary = { total_orders: orders.length, orders_with_slot: slotWithTextCount, orders_without_slot: orders.length - slotWithTextCount };

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
      logged_at: keepWallTimeAsVietnam(row.logged_at),
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
        cost: row.cost, slot: normalizePackageSlot(row.slot), storage_total: row.storage_total == null ? null : String(row.storage_total),
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

    // Tự động đồng bộ doanh thu vào finance.daily_revenue_summary
    await syncDailyRevenueSummary(trx);

    // Tự động đồng bộ chi phí & nhập ngoài luồng từ V1 store_profit_expenses
    try {
      const v1Expenses = await sourceDb('finance.store_profit_expenses').select('*');
      for (const r of v1Expenses) {
        const expenseType = r.expense_type === 'withdraw_profit' ? 'monthly_expense' : r.expense_type;
        const expenseDate = r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        await trx('finance.store_profit_expenses').insert({
          id: r.id,
          amount: r.amount,
          reason: r.reason,
          expense_type: expenseType,
          expense_date: expenseDate,
          linked_order_code: r.linked_order_code,
          expense_meta: r.expense_meta ? JSON.stringify(r.expense_meta) : null,
          shop_bank_account_id: null,
          status: r.status || 'completed',
          created_at: r.created_at,
          updated_at: r.created_at,
        }).onConflict('id').ignore();
      }
      await trx.raw("SELECT setval(pg_get_serial_sequence('finance.store_profit_expenses', 'id'), COALESCE((SELECT MAX(id) FROM finance.store_profit_expenses), 1), true)");
    } catch (eErr) {
      console.warn('⚠️ [Store Profit Expenses] Bỏ qua import chi phí:', eErr.message);
    }

    // Tự động đồng bộ tài khoản quản trị (admin, mavryk) từ V1
    try {
      const v1Users = await sourceDb('finance.users').select('*');
      const bcrypt = require('bcryptjs');
      const defaultPass = String(process.env.DEFAULT_ADMIN_PASS || 'admin123').trim();
      const adminHash = defaultPass ? await bcrypt.hash(defaultPass, 10) : null;

      for (const u of v1Users) {
        const pass = (u.username === 'admin' && adminHash) ? adminHash : u.passwordhash;
        await trx('admin.users')
          .insert({
            username: u.username,
            passwordhash: pass,
            role: String(u.role || 'admin').toLowerCase(),
            createdat: u.createdat || trx.fn.now(),
          })
          .onConflict('username')
          .merge({
            passwordhash: pass,
            role: String(u.role || 'admin').toLowerCase(),
          });
      }
      console.log(`👤 [Users] Đã đồng bộ ${v1Users.length} tài khoản quản trị từ V1: ${v1Users.map(u => u.username).join(', ')}`);
    } catch (uErr) {
      console.warn('⚠️ [Users] Bỏ qua import users:', uErr.message);
    }

    // Tự động đồng bộ tài khoản ngân hàng thật & sổ cái từ V1
    try {
      const v1Accounts = await sourceDb('finance.financial_accounts').select('*');
      for (const a of v1Accounts) {
        await trx('finance.financial_accounts')
          .insert({
            id: a.id,
            account_type: a.account_type || 'bank',
            label: a.label || null,
            account_number: a.account_number || null,
            account_holder: a.account_holder || null,
            bank_bin: a.bank_bin || null,
            bank_short_code: a.bank_short_code || null,
            bank_display_name: a.bank_display_name || null,
            qr_note_prefix: a.qr_note_prefix || null,
            account_scope: a.account_type === 'usdt' ? 'USDT' : 'SHOP',
            is_default: Boolean(a.is_default),
            balance: a.balance || 0,
            is_active: a.is_active !== undefined ? Boolean(a.is_active) : true,
            total_withdrawn: a.total_withdrawn || 0,
            total_received: a.total_received || 0,
            is_deleted: a.id === 1 ? false : Boolean(a.is_deleted),
            created_at: a.created_at || trx.fn.now(),
            updated_at: a.updated_at || trx.fn.now(),
          })
          .onConflict('id')
          .merge({
            label: a.label,
            account_number: a.account_number,
            account_holder: a.account_holder,
            bank_bin: a.bank_bin,
            bank_short_code: a.bank_short_code,
            bank_display_name: a.bank_display_name,
            qr_note_prefix: a.qr_note_prefix,
            balance: a.balance,
            is_active: Boolean(a.is_active),
            total_withdrawn: a.total_withdrawn,
            total_received: a.total_received,
            is_deleted: a.id === 1 ? false : Boolean(a.is_deleted),
            updated_at: trx.fn.now(),
          });
      }
      await trx.raw("SELECT setval(pg_get_serial_sequence('finance.financial_accounts', 'id'), COALESCE((SELECT MAX(id) FROM finance.financial_accounts), 1), true)");
      console.log(`🏦 [Bank Accounts] Đã đồng bộ ${v1Accounts.length} tài khoản ngân hàng từ V1.`);

      // Đồng bộ sổ cái tài khoản ngân hàng từ V1 (571 giao dịch)
      const v1Ledger = await sourceDb('finance.financial_account_ledger').select('*');
      for (const lg of v1Ledger) {
        await trx('finance.financial_account_ledger')
          .insert({
            id: lg.id,
            financial_account_id: lg.financial_account_id,
            amount: lg.amount,
            balance_after: lg.balance_after,
            entry_type: lg.entry_type || 'transaction',
            reference_type: lg.source_kind || null,
            reference_id: lg.source_id ? String(lg.source_id) : null,
            description: lg.note || null,
            metadata: JSON.stringify({
              signed_amount: lg.signed_amount,
              exchange_rate: lg.exchange_rate,
              vnd_equivalent: lg.vnd_equivalent,
            }),
            created_at: lg.created_at || trx.fn.now(),
          })
          .onConflict('id')
          .ignore();
      }
      await trx.raw("SELECT setval(pg_get_serial_sequence('finance.financial_account_ledger', 'id'), COALESCE((SELECT MAX(id) FROM finance.financial_account_ledger), 1), true)");
      console.log(`📖 [Bank Ledger] Đã đồng bộ ${v1Ledger.length} giao dịch sổ cái ngân hàng từ V1.`);
    } catch (accErr) {
      console.warn('⚠️ [Bank Accounts/Ledger] Bỏ qua import tài khoản/sổ cái:', accErr.message);
    }

    // Tự động nạp cấu hình hệ thống & tài khoản ngân hàng chính từ .env.docker
    try {
      const { syncSystemConfigs, syncShopBankAccount, parseEnvDocker } = require('./importSystemConfigsFromDockerEnv');
      const envDocker = parseEnvDocker();
      await syncSystemConfigs(trx, envDocker);
      await syncShopBankAccount(trx, envDocker);
    } catch (cfgErr) {
      console.warn('⚠️ [System Configs] Không thể nạp cấu hình từ .env.docker:', cfgErr.message);
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
    daily_revenue_summaries: await count(TARGET.dailySummary),
    system_configs: await count(TARGET.systemConfigs),
    shop_bank_accounts: await count(TARGET.shopBankAccounts),
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
  fs.writeFileSync(reportPath, `${JSON.stringify(redactReport(report), null, 2)}\n`, 'utf8');
  return reportPath;
}

function redactReport(value, key = '') {
  const isSensitiveKey = /password|passmail|token|secret|api[_-]?key|authorization|cookie|backup_email|two_fa|original.?slot/i.test(key);
  if (isSensitiveKey) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => redactReport(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactReport(entryValue, entryKey)]));
  }
  return value;
}

async function main() {
  console.log('========================================================================');
  console.log('🚀 MAVRYK V1 ➔ V2 OPERATIONAL DATA IMPORTER (ALL-IN-ONE PRODUCTION)');
  console.log('========================================================================');

  const sourceUrl = connectionUrl('V1_DATABASE_URL', 'mydtbmav_v1_restore');
  const targetUrl = connectionUrl('V2_IMPORT_DATABASE_URL', 'mydtbmav');
  assertSafeTarget(targetUrl);
  const sourceDb = knex({ client: 'pg', connection: sourceUrl });
  const targetDb = knex({ client: 'pg', connection: targetUrl });
  try {
    const source = await loadSource(sourceDb);
    const report = createReport(source, databaseName(sourceUrl), databaseName(targetUrl));
    console.log(`[V1 import] Source DB: ${report.source_database}`);
    console.log(`[V1 import] Target DB: ${report.target_database}`);
    console.log(`[V1 import] Mode:      ${report.mode.toUpperCase()}`);
    console.log(`[V1 import] Reset:     ${report.reset_target ? 'YES' : 'NO'}`);
    console.table(report.source_counts);

    if (!applyChanges) {
      console.log(`\n⚠️ DRY-RUN HOÀN TẤT. Chưa có dữ liệu nào được ghi vào ${report.target_database}.`);
      console.log(`👉 Chạy thêm cờ --apply (và --reset-target nếu muốn tạo mới schema) để thực thi.`);
      const reportPath = writeReport(report);
      console.log(`📄 Báo cáo dry-run: ${reportPath}`);
      return;
    }

    if (resetTarget) {
      console.log('\n🧹 Đang reset target database và chạy migrations mới nhất...');
      await resetSandbox(targetDb);
      console.log('✅ Reset và migration hoàn tất.');
    }

    console.log('\n📦 Đang nạp dữ liệu chuẩn hóa sang target database...');
    await importData(targetDb, sourceDb, source, report);

    console.log('\n🔍 Đang kiểm tra tính toàn vẹn (Integrity & Validation)...');
    await validateTarget(sourceDb, targetDb, report);

    const reportPath = writeReport(report);

    console.log('\n========================================================================');
    console.log('🎉 NHẬP LIỆU TOÀN DIỆN THÀNH CÔNG RỰC RỠ!');
    console.log('========================================================================');
    console.log('📊 Phân bố trạng thái đơn hàng (Chuẩn hóa tự động):');
    console.table(report.status_distribution);
    console.log('📦 Thống kê dữ liệu Slot text:');
    console.table(report.slot_summary);
    console.log('📋 Số lượng bảng đích đã nạp:');
    console.table(report.validation.counts);

    if (Object.values(report.validation.integrity).some((count) => count !== 0)) {
      throw new Error(`Integrity validation failed; see ${reportPath}`);
    }

    console.log(`📄 Chi tiết báo cáo JSON: ${reportPath}`);
  } finally {
    await Promise.all([sourceDb.destroy(), targetDb.destroy()]);
  }
}

main().catch((error) => {
  console.error('❌ [V1 import] LỖI THỰC THI:', error.message);
  process.exitCode = 1;
});
