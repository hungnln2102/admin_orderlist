/**
 * systemConfigService.js (V2)
 * Quản lý các cấu hình hệ thống bằng cơ chế Cache In-Memory và Database (Zero Downtime)
 */

const { db, TABLES } = require("@/db");
const { eventBus, EVENTS } = require("@/events");

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

/**
 * 3. Cập nhật cấu hình vào Database và đồng bộ lại Cache
 * @param {string} key - Tên cấu hình
 * @param {string} rawValue - Giá trị dưới dạng chuỗi (Sẽ được lưu vào text)
 * @param {string} updatedBy - Tên người cập nhật (Mặc định 'ADMIN')
 */
const set = async (key, rawValue, updatedBy = 'ADMIN') => {
  const existing = await db(TABLES.SYSTEM_CONFIGS).where({ config_key: key }).first();
  if (!existing) {
    throw new Error(`Cấu hình ${key} không tồn tại trong hệ thống.`);
  }

  const oldValueParsed = parseValue(existing.config_value, existing.data_type);
  const newValueParsed = parseValue(rawValue, existing.data_type);

  await db(TABLES.SYSTEM_CONFIGS)
    .where({ config_key: key })
    .update({
      config_value: String(rawValue),
      updated_at: db.fn.now(),
      updated_by: updatedBy
    });

  // Cập nhật lại Cache memory
  configCache[key] = {
    value: newValueParsed,
    dataType: existing.data_type,
    group: existing.group_name
  };

  // Phát Event để các module khác biết nếu cần
  eventBus.emit(EVENTS.SYSTEM_CONFIG_UPDATED, {
    key,
    old_value: oldValueParsed,
    new_value: newValueParsed,
    updated_by: updatedBy,
    summary: `Thay đổi cấu hình hệ thống: [${key}] từ '${oldValueParsed}' thành '${newValueParsed}'`
  });

  return { success: true, key, value: newValueParsed };
};

/**
 * 4. Lấy toàn bộ danh sách cấu hình (Dùng cho giao diện Admin)
 */
const getAllConfigs = async () => {
  const rows = await db(TABLES.SYSTEM_CONFIGS).orderBy('group_name', 'asc').orderBy('config_key', 'asc');
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
  set,
  getAllConfigs,
  getNotificationLogs
};
