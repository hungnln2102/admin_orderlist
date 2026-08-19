const { db } = require("@/db");
const logger = require("@/utils/logger");
const {
  EXTERNAL_API_CONFIGS_SCHEMA,
  SCHEMA_RENEW_ADOBE,
  tableName,
} = require("@/config/dbSchema");

const SCHEMA = SCHEMA_RENEW_ADOBE;
const DEF = EXTERNAL_API_CONFIGS_SCHEMA.EXTERNAL_API_CONFIGS;
const TABLE = tableName(DEF.TABLE, SCHEMA);
const C = DEF.COLS;

/* ── In-memory cache ──────────────────────────────────────── */
const cache = new Map();
const cacheTimestamps = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/* ── Ensure table ─────────────────────────────────────────── */
let ensurePromise = null;

function ensureTable() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      try {
        await db.raw(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
        await db.raw(`
          CREATE TABLE IF NOT EXISTS ${TABLE} (
            ${C.ID}            SERIAL PRIMARY KEY,
            ${C.SERVICE_KEY}   VARCHAR(100) NOT NULL UNIQUE,
            ${C.SERVICE_NAME}  VARCHAR(255) NOT NULL,
            ${C.DESCRIPTION}   TEXT DEFAULT '',
            ${C.BASE_URL}      TEXT NOT NULL,
            ${C.ENDPOINTS}     JSONB NOT NULL DEFAULT '{}'::jsonb,
            ${C.AUTH_CONFIG}    JSONB NOT NULL DEFAULT '{}'::jsonb,
            ${C.FIELD_MAPPING}  JSONB NOT NULL DEFAULT '[]'::jsonb,
            ${C.IS_ACTIVE}     BOOLEAN NOT NULL DEFAULT true,
            ${C.CREATED_AT}    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ${C.UPDATED_AT}    TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await seedDefaults();
        logger.info("[ext-api-config] Bảng %s đã sẵn sàng.", TABLE);
      } catch (err) {
        ensurePromise = null;
        throw err;
      }
    })();
  }
  return ensurePromise;
}

/* ── Seed dữ liệu mặc định ───────────────────────────────── */
const SEED_DATA = [
  {
    [C.SERVICE_KEY]: "yuna_2fa",
    [C.SERVICE_NAME]: "Yuna 2FA Center",
    [C.DESCRIPTION]: "API tra cứu mã đơn, lấy OTP và báo lỗi tài khoản từ YunaGRP.",
    [C.BASE_URL]: "https://hub.yunagrp.com/2fa/",
    [C.ENDPOINTS]: JSON.stringify({}),
    [C.AUTH_CONFIG]: JSON.stringify({
      type: "meta_token",
      defaultToken: "d7c79d236dcb94c2ce0bfb3a10bf68d71ec02d08cfd07882beb4fe9152fb85cb",
      metaSelector: "meta[name='api-token']",
    }),
    [C.FIELD_MAPPING]: JSON.stringify([
      { key: "items", label: "Danh sách tài khoản", path: "items" },
      { key: "time_left", label: "Thời gian còn lại", path: "time_left" },
    ]),
  },
  {
    [C.SERVICE_KEY]: "yuna_mail",
    [C.SERVICE_NAME]: "Yuna Mail Rules & API",
    [C.DESCRIPTION]: "Tải rules routing domain email và API lấy OTP cho action api_local.",
    [C.BASE_URL]: "https://mail.yunagrp.com",
    [C.ENDPOINTS]: JSON.stringify({
      rules: "https://mail.yunagrp.com/admin.php?public=rules",
      mail_api: "https://mail.yunagrp.com/api.php",
    }),
    [C.AUTH_CONFIG]: JSON.stringify({}),
    [C.FIELD_MAPPING]: JSON.stringify([]),
  },
  {
    [C.SERVICE_KEY]: "otp_hdsd",
    [C.SERVICE_NAME]: "OTP HDSD",
    [C.DESCRIPTION]: "API lấy OTP từ otp.hdsd.net.",
    [C.BASE_URL]: "https://otp.hdsd.net",
    [C.ENDPOINTS]: JSON.stringify({
      get_otp: "/get_otp_api",
    }),
    [C.AUTH_CONFIG]: JSON.stringify({}),
    [C.FIELD_MAPPING]: JSON.stringify([
      { key: "otp", label: "Mã OTP", path: "data.code" },
    ]),
  },
  {
    [C.SERVICE_KEY]: "tmail_webmail",
    [C.SERVICE_NAME]: "Tmail Webmail (wibucrypto)",
    [C.DESCRIPTION]: "Webmail tmail.wibucrypto.pro — cào OTP cho email @sluemone.xyz, @kaineapp.top.",
    [C.BASE_URL]: "https://tmail.wibucrypto.pro",
    [C.ENDPOINTS]: JSON.stringify({
      mailbox: "/mailbox/{email}",
    }),
    [C.AUTH_CONFIG]: JSON.stringify({}),
    [C.FIELD_MAPPING]: JSON.stringify([]),
  },
  {
    [C.SERVICE_KEY]: "generator_email",
    [C.SERVICE_NAME]: "Generator.email",
    [C.DESCRIPTION]: "Webmail generator.email — cào OTP cho email @rilzz.store, fallback Microsoft.",
    [C.BASE_URL]: "https://generator.email",
    [C.ENDPOINTS]: JSON.stringify({
      mailbox: "/{email}",
      microsoft_fallback: "/adobeyunacode@fatub.org",
    }),
    [C.AUTH_CONFIG]: JSON.stringify({}),
    [C.FIELD_MAPPING]: JSON.stringify([]),
  },
];

async function seedDefaults() {
  for (const row of SEED_DATA) {
    const exists = await db(TABLE).where(C.SERVICE_KEY, row[C.SERVICE_KEY]).first();
    if (!exists) {
      await db(TABLE).insert(row);
      logger.info("[ext-api-config] Đã seed config: %s", row[C.SERVICE_KEY]);
    }
  }
}

/* ── CRUD ─────────────────────────────────────────────────── */

async function getConfigByKey(serviceKey) {
  await ensureTable();

  const now = Date.now();
  if (cache.has(serviceKey) && now - (cacheTimestamps.get(serviceKey) || 0) < CACHE_TTL_MS) {
    return cache.get(serviceKey);
  }

  const row = await db(TABLE)
    .where(C.SERVICE_KEY, serviceKey)
    .where(C.IS_ACTIVE, true)
    .first();

  if (row) {
    cache.set(serviceKey, row);
    cacheTimestamps.set(serviceKey, now);
  }
  return row || null;
}

async function getAllConfigs() {
  await ensureTable();
  return db(TABLE).orderBy(C.ID, "asc");
}

async function getConfigById(id) {
  await ensureTable();
  return db(TABLE).where(C.ID, id).first();
}

async function createConfig(data) {
  await ensureTable();
  validateConfig(data);
  const now = new Date();
  const [row] = await db(TABLE)
    .insert({
      [C.SERVICE_KEY]: data.service_key,
      [C.SERVICE_NAME]: data.service_name,
      [C.DESCRIPTION]: data.description || "",
      [C.BASE_URL]: data.base_url,
      [C.ENDPOINTS]: JSON.stringify(data.endpoints || {}),
      [C.AUTH_CONFIG]: JSON.stringify(data.auth_config || {}),
      [C.FIELD_MAPPING]: JSON.stringify(data.field_mapping || []),
      [C.IS_ACTIVE]: data.is_active !== false,
      [C.CREATED_AT]: now,
      [C.UPDATED_AT]: now,
    })
    .returning("*");
  clearCache(data.service_key);
  return row;
}

async function updateConfig(id, data) {
  await ensureTable();
  const existing = await db(TABLE).where(C.ID, id).first();
  if (!existing) throw new Error("Không tìm thấy cấu hình với ID này.");

  const updates = { [C.UPDATED_AT]: new Date() };

  if (data.service_name !== undefined) updates[C.SERVICE_NAME] = data.service_name;
  if (data.description !== undefined) updates[C.DESCRIPTION] = data.description;
  if (data.base_url !== undefined) {
    if (!data.base_url.trim()) throw new Error("Base URL không được để trống.");
    updates[C.BASE_URL] = data.base_url.trim();
  }
  if (data.endpoints !== undefined) updates[C.ENDPOINTS] = JSON.stringify(data.endpoints);
  if (data.auth_config !== undefined) updates[C.AUTH_CONFIG] = JSON.stringify(data.auth_config);
  if (data.field_mapping !== undefined) updates[C.FIELD_MAPPING] = JSON.stringify(data.field_mapping);
  if (data.is_active !== undefined) updates[C.IS_ACTIVE] = data.is_active;

  const [row] = await db(TABLE).where(C.ID, id).update(updates).returning("*");
  clearCache(existing[C.SERVICE_KEY]);
  if (data.service_key && data.service_key !== existing[C.SERVICE_KEY]) {
    clearCache(data.service_key);
  }
  return row;
}

async function deleteConfig(id) {
  await ensureTable();
  const existing = await db(TABLE).where(C.ID, id).first();
  if (!existing) throw new Error("Không tìm thấy cấu hình với ID này.");
  await db(TABLE).where(C.ID, id).del();
  clearCache(existing[C.SERVICE_KEY]);
  return existing;
}

/* ── Helpers ──────────────────────────────────────────────── */

function validateConfig(data) {
  if (!data.service_key || !String(data.service_key).trim()) {
    throw new Error("Service Key không được để trống.");
  }
  if (!data.service_name || !String(data.service_name).trim()) {
    throw new Error("Tên dịch vụ không được để trống.");
  }
  if (!data.base_url || !String(data.base_url).trim()) {
    throw new Error("Base URL không được để trống.");
  }
}

function clearCache(serviceKey) {
  if (serviceKey) {
    cache.delete(serviceKey);
    cacheTimestamps.delete(serviceKey);
  }
}

function clearAllCache() {
  cache.clear();
  cacheTimestamps.clear();
}

module.exports = {
  ensureTable,
  getConfigByKey,
  getAllConfigs,
  getConfigById,
  createConfig,
  updateConfig,
  deleteConfig,
  clearAllCache,
  TABLE,
  C,
};
