/**
 * systemConfigService.js (V2)
 * Quản lý các cấu hình hệ thống bằng cơ chế Cache In-Memory và Database (Zero Downtime)
 */

const { db, TABLES, withTransaction } = require("@/db");
const { COLS } = require("@/db/tables");
const { publishEventInTrx, EVENTS } = require("@/events");

const PROVIDER_DISPLAY_NAMES_KEY = "OTP_PROVIDER_DISPLAY_NAMES";
const ADOBE_TOPIC_KEY = "TELEGRAM_ADOBE_MISSING_SUBSCRIPTION_TOPIC_ID";
const ADOBE_TOPIC_DEFAULT = {
  config_key: ADOBE_TOPIC_KEY,
  config_value: "",
  data_type: "STRING",
  group_name: "NOTIFY",
  description: "ID của topic nhận cảnh báo tài khoản Adobe không còn gói đăng ký",
};

// In-Memory Cache lưu cấu hình để tránh query DB liên tục
let configCache = {};

/**
 * Phân tích chuỗi sang đúng định dạng data_type
 */
const parseValue = (value, dataType) => {
  if (value === null || value === undefined) return value;
  switch (dataType) {
    case 'NUMBER':
      return Number(value);
    case 'BOOLEAN':
      return value === 'true' || value === '1';
    case 'JSON':
      try {
        return JSON.parse(value);
      } catch (e) {
        return {};
      }
    case 'STRING':
    default:
      return String(value);
  }
};

const validateValue = (key, rawValue, dataType) => {
  if (rawValue === null || rawValue === undefined || typeof rawValue === "object") {
    throw new Error(`Giá trị cấu hình ${key} không hợp lệ.`);
  }
  const value = String(rawValue).trim();
  switch (dataType) {
    case 'NUMBER':
      if (value === "" || !Number.isFinite(Number(value))) {
        throw new Error(`Cấu hình ${key} phải là số hợp lệ.`);
      }
      break;
    case 'BOOLEAN':
      if (!['true', 'false', '1', '0'].includes(value)) {
        throw new Error(`Cấu hình ${key} chỉ nhận giá trị true/false.`);
      }
      break;
    case 'JSON':
      try {
        JSON.parse(value);
      } catch (e) {
        throw new Error(`Cấu hình ${key} phải là JSON hợp lệ.`);
      }
      break;
    default:
      if (value.length > 2000) {
        throw new Error(`Cấu hình ${key} vượt quá 2000 ký tự.`);
      }
  }
  return value;
};

/**
 * 1. Khởi tạo Cache từ Database (Chạy 1 lần lúc boot server)
 */
const initCache = async () => {
  try {
    const rows = await db(TABLES.SYSTEM_CONFIGS).select('*');
    const newCache = {};
    rows.forEach(row => {
      newCache[row.config_key] = {
        value: parseValue(row.config_value, row.data_type),
        dataType: row.data_type,
        group: row.group_name
      };
    });
    configCache = newCache;
    console.log(`[ConfigService] Loaded ${rows.length} system configs into memory.`);
  } catch (error) {
    console.error("[ConfigService] Lỗi khi load system configs (Bảng có thể chưa được tạo):", error.message);
  }
};

/**
 * 2. Lấy giá trị Config từ Cache Memory (Cực nhanh, Zero Latency)
 * @param {string} key - Tên cấu hình (Ví dụ: RENEWAL_WARN_DAYS)
 * @param {any} defaultValue - Giá trị trả về nếu không tìm thấy
 */
const get = (key, defaultValue = null) => {
  if (configCache.hasOwnProperty(key)) {
    return configCache[key].value;
  }
  return defaultValue;
};

const getInteger = (key, defaultValue, min, max) => {
  const value = Number(get(key, defaultValue));
  if (!Number.isInteger(value) || value < min || value > max) return defaultValue;
  return value;
};

/**
 * 3. Cập nhật cấu hình vào Database và đồng bộ lại Cache
 * @param {string} key - Tên cấu hình
 * @param {string} rawValue - Giá trị dưới dạng chuỗi (Sẽ được lưu vào text)
 * @param {string} updatedBy - Tên người cập nhật (Mặc định 'ADMIN')
 */
const writeConfig = async (key, resolveValue, updatedBy) => withTransaction(async (trx) => {
  const C = COLS.SYSTEM_CONFIGS;
  const existing = await trx(TABLES.SYSTEM_CONFIGS).where(C.CONFIG_KEY, key).forUpdate().first();
  const rawValue = resolveValue(existing);
  if (rawValue === undefined) return { success: true, key };
  const isObject = typeof rawValue === 'object' && rawValue !== null;
  const stringValue = isObject ? JSON.stringify(rawValue) : rawValue;

  if (!existing) {
    const isJson = isObject || (typeof stringValue === 'string' && (stringValue.startsWith('{') || stringValue.startsWith('[')));
    const dataType = isJson ? 'JSON' : 'STRING';
    const normalizedValue = typeof stringValue === 'string' ? stringValue : JSON.stringify(stringValue);
    const isAdobeTopic = key === ADOBE_TOPIC_KEY;
    const group = isAdobeTopic ? ADOBE_TOPIC_DEFAULT.group_name : 'OTP_PORTAL';
    const [inserted] = await trx(TABLES.SYSTEM_CONFIGS)
      .insert({
        config_key: key,
        config_value: normalizedValue,
        data_type: dataType,
        group_name: group,
        description: isAdobeTopic ? ADOBE_TOPIC_DEFAULT.description : 'Cấu hình tự động khởi tạo: ' + key,
        updated_at: trx.fn.now(),
        updated_by: updatedBy,
      })
      .returning("*");
    
    trx.afterCommit(() => {
      configCache[key] = { value: isObject ? rawValue : parseValue(normalizedValue, dataType), dataType, group };
    });
    return inserted;
  }

  const normalizedValue = validateValue(key, stringValue, existing.data_type);
  const oldValueParsed = parseValue(existing.config_value, existing.data_type);
  const newValueParsed = parseValue(normalizedValue, existing.data_type);
  const changes = {
    config_value: { old: oldValueParsed, new: newValueParsed },
    updated_by: { old: existing.updated_by, new: updatedBy },
  };

  const [updated] = await trx(TABLES.SYSTEM_CONFIGS)
    .where({ config_key: key })
    .update({ config_value: normalizedValue, updated_at: trx.fn.now(), updated_by: updatedBy })
    .returning("*");

  await publishEventInTrx(trx, {
    eventName: EVENTS.SYSTEM_CONFIG_UPDATED,
    aggregateType: "SYSTEM_CONFIG",
    aggregateId: updated.id || key,
    action: "UPDATE",
    beforeState: existing,
    afterState: updated,
    changedFields: changes,
    actorType: "ADMIN",
    actorId: updatedBy,
    source: "SYSTEM_CONFIG",
    payload: { key, old_value: oldValueParsed, new_value: newValueParsed, updated_by: updatedBy },
  });

  trx.afterCommit(() => {
    configCache[key] = { value: newValueParsed, dataType: existing.data_type, group: existing.group_name };
  });

  return { success: true, key, value: newValueParsed };
});

const set = (key, rawValue, updatedBy = "ADMIN") => {
  if (key === PROVIDER_DISPLAY_NAMES_KEY) {
    throw new Error("Hãy cập nhật tên hiển thị từ danh mục provider.");
  }
  if (key === ADOBE_TOPIC_KEY) {
    const value = validateValue(key, rawValue, ADOBE_TOPIC_DEFAULT.data_type);
    if (value && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1)) {
      throw new Error("ID topic Telegram cần là số nguyên dương hoặc để trống.");
    }
    return writeConfig(key, () => value, updatedBy);
  }
  return writeConfig(key, () => rawValue, updatedBy);
};

const getProviderDisplayName = (key) => {
  const names = get(PROVIDER_DISPLAY_NAMES_KEY, {});
  return names && Object.hasOwn(names, key) && typeof names[key] === "string" && names[key]
    ? names[key]
    : key;
};

const setProviderDisplayName = (key, displayName, updatedBy) =>
  writeConfig(PROVIDER_DISPLAY_NAMES_KEY, (existing) => {
    if (!existing) throw new Error("Chưa khởi tạo danh mục tên hiển thị provider.");
    const names = JSON.parse(existing[COLS.SYSTEM_CONFIGS.CONFIG_VALUE]);
    if (!names || typeof names !== "object" || Array.isArray(names)) {
      throw new Error("Cấu hình tên hiển thị provider không hợp lệ.");
    }
    if (displayName === null) {
      if (!Object.hasOwn(names, key)) return undefined;
      delete names[key];
    } else {
      if (names[key] === displayName) return undefined;
      names[key] = displayName;
    }
    return names;
  }, updatedBy);

const updateOtpSlot = async (slotKey, change, updatedBy) => {
  let slot;
  await writeConfig("OTP_PORTAL_SLOTS_CONFIG", (existing) => {
    const C = COLS.SYSTEM_CONFIGS;
    const slots = existing
      ? JSON.parse(existing[C.CONFIG_VALUE])
      : require("./otpPortalDispatcher").DEFAULT_SLOTS;
    if (!Array.isArray(slots)) throw new Error("Cấu hình ô OTP không hợp lệ.");
    const index = slots.findIndex((slot) => slot?.slot_key === slotKey);
    if (index < 0) throw new Error("Không tìm thấy ô OTP.");

    slot = change(slots[index]);
    if (slot === slots[index]) return undefined;
    return slots.map((item, i) => i === index ? slot : item);
  }, updatedBy);
  return slot;
};

const assignedOtpProviders = (slot) => Array.isArray(slot.assigned_services)
  ? slot.assigned_services
  : [slot.primary_service_key, slot.fallback_service_key].filter(Boolean);

const patchOtpSlot = (slotKey, change, updatedBy = "ADMIN") =>
  updateOtpSlot(slotKey, (slot) => {
    const { action, serviceKey, enabled } = change || {};
    const assigned = assignedOtpProviders(slot);
    if (action === "addProvider" && typeof serviceKey === "string" && serviceKey.trim() &&
        serviceKey === serviceKey.trim() && serviceKey !== "none") {
      return assigned.includes(serviceKey) ? slot : { ...slot, assigned_services: [...assigned, serviceKey] };
    }
    if (action === "setEnabled" && typeof enabled === "boolean") {
      return slot.enabled === enabled ? slot : { ...slot, enabled };
    }
    throw new Error("Thay đổi cấu hình ô OTP không hợp lệ.");
  }, updatedBy);

const removeOtpSlotProvider = (slotKey, providerKey, updatedBy = "ADMIN") =>
  updateOtpSlot(slotKey, (slot) => {
    const assigned = assignedOtpProviders(slot);
    const next = {
      ...slot,
      assigned_services: assigned.filter((key) => key !== providerKey),
    };
    for (const field of ["primary_service_key", "fallback_service_key"]) {
      if (next[field] === providerKey) next[field] = null;
    }
    if (next.assigned_services.length === assigned.length &&
        next.primary_service_key === slot.primary_service_key &&
        next.fallback_service_key === slot.fallback_service_key) return slot;
    return next;
  }, updatedBy);

/**
 * 4. Lấy toàn bộ danh sách cấu hình (Dùng cho giao diện Admin)
 */
const getAllConfigs = async () => {
  const rows = await db(TABLES.SYSTEM_CONFIGS).orderBy('group_name', 'asc').orderBy('config_key', 'asc');
  if (!rows.some((row) => row.config_key === ADOBE_TOPIC_KEY)) {
    rows.push(ADOBE_TOPIC_DEFAULT);
  }
  return rows.map(r => ({
    id: r.id,
    config_key: r.config_key,
    config_value: parseValue(r.config_value, r.data_type),
    raw_value: r.config_value,
    data_type: r.data_type,
    description: r.description,
    group_name: r.group_name,
    updated_at: r.updated_at,
    updated_by: r.updated_by
  }));
};

/**
 * 5. Lấy danh sách lịch sử thông báo (Notification Logs)
 */
const getNotificationLogs = async ({ page = 1, limit = 50, status, channel } = {}) => {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
  const query = db(TABLES.NOTIFICATION_LOGS);

  if (status) {
    query.where({ status });
  }
  if (channel) {
    query.where({ channel });
  }

  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
  const totalRow = await query.clone().count('* as total').first();
  const total = totalRow ? Number(totalRow.total) : 0;

  const logs = await query
    .orderBy('id', 'desc')
    .limit(Number(limit))
    .offset(offset);

  return {
    data: logs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  };
};

module.exports = {
  initCache,
  get,
  getInteger,
  set,
  getProviderDisplayName,
  setProviderDisplayName,
  patchOtpSlot,
  removeOtpSlotProvider,
  getAllConfigs,
  getNotificationLogs
};
