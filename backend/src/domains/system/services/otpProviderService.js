const { getProviderConfig } = require("../providers/registry");
const { fetchOtpFromTinyHost } = require("../providers/tinyhostProvider");
const { fetchOtpFromFixAdes } = require("../providers/adesProvider");
const { fetchFixAdesStatus } = require("../providers/fixAdesStatusProvider");
const { fetchYunaAccountOrder } = require("../providers/yuna2faProvider");
const { fetchOtpFromYunaMail } = require("../providers/yunaMailProvider");
const { fetchOtpFromVivaRocky } = require("../providers/vivarockyProvider");
const { fetchOtpFromImap } = require("../providers/imap");

function getValueByPath(obj, path) {
  if (!obj || !path) return undefined;
  const normalized = String(path).trim().replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "");
  const keys = normalized.split(".");
  let curr = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (curr == null) return undefined;
    if (Array.isArray(curr) && !/^\d+$/.test(key)) {
      curr = curr[0]?.[key];
    } else {
      curr = curr[key];
    }
  }
  return curr;
}

async function fetch2FaFromWarehouse(queryInput) {
  if (!queryInput) return { otp: null, extra_fields: [], message: "Vui lòng nhập email hoặc mã đơn hàng cần tra cứu." };
  const cleanInput = String(queryInput).trim();
  const { db, TABLES } = require("@/db");
  const totpService = require("./totpService");

  try {
    // 1. Tìm trong warehouse.account_slots kết hợp accounts
    let matched = await db(TABLES.ACCOUNT_SLOTS)
      .join(TABLES.ACCOUNTS, `${TABLES.ACCOUNT_SLOTS}.account_id`, `${TABLES.ACCOUNTS}.id`)
      .where(function () {
        this.whereILike(`${TABLES.ACCOUNTS}.account_username`, cleanInput)
          .orWhereILike(`${TABLES.ACCOUNT_SLOTS}.backup_email`, cleanInput)
          .orWhereILike(`${TABLES.ACCOUNT_SLOTS}.customer`, cleanInput)
          .orWhere(`${TABLES.ACCOUNT_SLOTS}.id_order`, cleanInput)
          .orWhere(`${TABLES.ACCOUNTS}.id_order`, cleanInput);
      })
      .select(
        `${TABLES.ACCOUNTS}.account_username`,
        `${TABLES.ACCOUNTS}.note as acc_note`,
        `${TABLES.ACCOUNT_SLOTS}.two_fa`,
        `${TABLES.ACCOUNT_SLOTS}.backup_email`,
        `${TABLES.ACCOUNT_SLOTS}.service_note`
      )
      .first();

    // 2. Nếu chưa thấy trong slots, tìm trực tiếp trong accounts
    if (!matched) {
      const acc = await db(TABLES.ACCOUNTS)
        .where(function () {
          this.whereILike("account_username", cleanInput)
            .orWhere("id_order", cleanInput);
        })
        .first();
      if (acc) {
        matched = {
          account_username: acc.account_username,
          acc_note: acc.note,
          two_fa: null,
        };
      }
    }

    if (!matched) {
      return {
        otp: null,
        found: false,
        message: `Không tìm thấy tài khoản [${cleanInput}] trong Kho Hàng.`,
      };
    }

    // 3. Trích xuất Secret Key 2FA
    let secretKey = matched.two_fa;
    if (!secretKey && matched.acc_note) {
      const m = matched.acc_note.match(/(?:2fa|totp|secret)[:\s]+([a-z2-7\s]{16,64})/i);
      if (m) secretKey = m[1];
    }

    if (!secretKey) {
      return {
        otp: null,
        found: false,
        message: `Tài khoản [${matched.account_username || cleanInput}] trong kho chưa được cài mã 2FA.`,
      };
    }

    // 4. Sinh mã OTP qua totpService
    const totpRes = totpService.generateTotp(secretKey);
    return {
      otp: totpRes.code,
      found: true,
      extra_fields: [
        { key: "account_username", label: "Tài khoản kho", value: matched.account_username || cleanInput, path: "account_username" },
        { key: "remaining_seconds", label: "Thời gian còn lại", value: `${totpRes.remainingSeconds}s`, path: "remainingSeconds" },
        { key: "expires_at", label: "Hết hạn lúc", value: totpRes.expiresAt, path: "expiresAt" },
      ],
      message: `Đã tìm thấy khóa 2FA trong kho và sinh mã OTP [${totpRes.code}] thành công!`,
    };
  } catch (err) {
    return {
      otp: null,
      found: false,
      message: `Lỗi tra cứu kho: ${err.message}`,
    };
  }
}

function normalizeExecutionResult(result) {
  if (typeof result === "string") return { otp: result || null, extra_fields: [], raw_data: { otp: result || null } };
  return {
    otp: result?.otp || null,
    extra_fields: Array.isArray(result?.extra_fields) ? result.extra_fields : [],
    raw_data: result?.raw_data || result?.rawData || result || null,
    error_message: result?.error_message || result?.error || null,
  };
}

async function executeInternalTotp(input) {
  const totpService = require("./totpService");
  try {
    const result = totpService.generateTotp(input);
    return normalizeExecutionResult({
      otp: result.code,
      raw_data: result,
      extra_fields: [
        { key: "remaining_seconds", label: "Thời gian còn lại", value: `${result.remainingSeconds}s`, path: "remainingSeconds" },
        { key: "expires_at", label: "Hết hạn lúc", value: result.expiresAt, path: "expiresAt" },
      ],
    });
  } catch (error) {
    return normalizeExecutionResult({ error: error.message });
  }
}

async function executeWarehouse2Fa(input) {
  return normalizeExecutionResult(await fetch2FaFromWarehouse(input));
}

const OTP_EXECUTION_HANDLERS = Object.freeze({
  MAILBOX_REST: async (config, input) => normalizeExecutionResult(await fetchOtpFromTinyHost(input, { config, includeDetails: true })),
  AUTHENTICATED_OTP: async (config, input) => normalizeExecutionResult(await fetchOtpFromFixAdes(input, { config, includeDetails: true })),
  FIX_ADES_STATUS: async (config, input) => normalizeExecutionResult(await fetchFixAdesStatus(input, { config })),
  YUNA_2FA: async (config, input) => normalizeExecutionResult(await fetchYunaAccountOrder(input, { config })),
  YUNA_MAIL: async (config, input) => normalizeExecutionResult(await fetchOtpFromYunaMail(input, { config, includeDetails: true })),
  VIVAROCKY_HTML: async (config, input, options) => normalizeExecutionResult(await fetchOtpFromVivaRocky(input, {
    config,
    serviceKey: config.service_key,
    type: config.auth_config?.operation || options?.subType || options?.type || "household",
    accessCode: options?.accessCode || config.auth_config?.access_code || "",
    includeDetails: true,
  })),
  INTERNAL_TOTP: async (_config, input) => executeInternalTotp(input),
  INTERNAL_WAREHOUSE_2FA: async (_config, input) => executeWarehouse2Fa(input),
  INTERNAL_IMAP: async (_config, input) => normalizeExecutionResult(await fetchOtpFromImap(input, { includeDetails: true })),
});

async function executeOtpConfig(config, input, options = {}) {
  const executionMode = String(config?.execution_mode || "").trim().toUpperCase();
  const handler = OTP_EXECUTION_HANDLERS[executionMode];
  if (!handler) throw new Error(`Unsupported OTP execution mode '${executionMode || "unknown"}' for service '${config?.service_key || "unknown"}'.`);
  return handler(config, input, options);
}

async function probeOtpForEmail({ email, serviceKey, ...options }) {
  if (!email) throw new Error("Vui lòng cung cấp email hoặc mã đơn hàng cần kiểm tra.");

  if (!serviceKey) throw new Error("OTP_PROVIDER_NOT_FOUND: service_key is required.");
  const queryInput = String(email).trim();
  const serviceConfig = getProviderConfig(serviceKey);
  if (!serviceConfig) throw new Error(`OTP_PROVIDER_NOT_FOUND: no active OTP configuration for service_key '${serviceKey}'.`);

  const executionMode = String(serviceConfig.execution_mode || "").trim().toUpperCase();
  const acceptsNonEmailInput = ["INTERNAL_TOTP", "INTERNAL_WAREHOUSE_2FA", "YUNA_2FA"].includes(executionMode);
  if (!acceptsNonEmailInput && !queryInput.includes("@")) {
    throw new Error("Vui lòng cung cấp email hợp lệ (vd: user@domain.com).");
  }

  const cleanInput = acceptsNonEmailInput ? queryInput : queryInput.toLowerCase();
  const startedAt = Date.now();
  const executionResult = await executeOtpConfig(serviceConfig, cleanInput, options);
  const extraFields = [...executionResult.extra_fields];
  const configuredFields = Array.isArray(serviceConfig.field_mapping) ? serviceConfig.field_mapping : [];

  if (executionResult.raw_data && configuredFields.length > 0) {
    for (const field of configuredFields) {
      if (field.is_primary || field.key === "otp") continue;
      if (extraFields.some((item) => item.path === field.path || item.key === field.key)) continue;
      const rawValue = getValueByPath(executionResult.raw_data, field.path);
      if (rawValue === undefined || rawValue === null || rawValue === "") continue;
      let value = typeof rawValue === "object" ? JSON.stringify(rawValue) : String(rawValue);
      if (/date|time|created_at/i.test(field.key) || /date|time/i.test(field.path)) {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed) && !/^\d{4,8}$/.test(value)) value = new Date(parsed).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" });
      }
      extraFields.push({ key: field.key || field.path, label: field.label || field.key, value, path: field.path });
    }
  }

  const found = Boolean(executionResult.otp || extraFields.some((field) => field.key !== "server_message"));
  return {
    success: true,
    email: queryInput,
    service_key: serviceConfig.service_key,
    otp: executionResult.otp || null,
    found,
    duration_ms: Date.now() - startedAt,
    extra_fields: extraFields,
    message: found
      ? (executionResult.otp ? `Đã tìm thấy mã OTP [${executionResult.otp}] thành công!` : `Đã lấy thông tin tài khoản thành công! (${extraFields.length} trường)`)
      : (executionResult.error_message || "Chưa có thư mới hoặc chưa lấy được mã OTP trong hộp thư."),
  };
}

module.exports = {
  fetchOtpFromVivaRocky,
  fetchOtpFromTinyHost,
  fetchOtpFromFixAdes,
  fetchYunaAccountOrder,
  fetchOtpFromYunaMail,
  getValueByPath,
  executeOtpConfig,
  probeOtpForEmail,
};
