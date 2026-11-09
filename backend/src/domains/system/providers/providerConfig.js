const PROVIDER_KEY_ALIASES = Object.freeze({
  fix_ades: "ades",
  yuna2fa: "yuna_2fa",
  yunaMail: "yuna_mail",
  vivarockyHousehold: "vivarocky_household",
  vivarockySixDigit: "vivarocky_six_digit",
  vivarockySignin: "vivarocky_signin",
  warehouse2fa: "warehouse_2fa",
  mail_imap: "imap",
});

function readBoolean(value, fallback = true) {
  if (value == null || value === "") return fallback;
  return String(value).toLowerCase() !== "false";
}

function readNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getImapConfig() {
  return {
    host: String(process.env.OTP_IMAP_HOST || "").trim(),
    port: readNumber(process.env.OTP_IMAP_PORT, 993),
    secure: readBoolean(process.env.OTP_IMAP_SECURE, true),
    user: String(process.env.OTP_IMAP_USER || "").trim(),
    password: String(process.env.OTP_IMAP_PASSWORD || ""),
    mailbox: String(process.env.OTP_IMAP_MAILBOX || "INBOX").trim() || "INBOX",
    allowedSenders: String(process.env.OTP_IMAP_ALLOWED_SENDERS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
    timeoutMs: readNumber(process.env.OTP_IMAP_TIMEOUT_MS, 15_000),
  };
}

function providerConfig(key) {
  const providerKey = PROVIDER_KEY_ALIASES[key] || String(key || "").trim();
  const configs = {
    tinyhost: { service_key: "tinyhost", service_name: "TinyHost", category: "OTP", execution_mode: "MAILBOX_REST", description: "Đọc mã OTP từ hòm thư TinyHost.", base_url: "https://tinyhost.shop", endpoints: { list: "/api/email/{domain}/{user}/", detail: "/api/email/{domain}/{user}/{id}" }, auth_config: { timeoutMs: 15_000 }, field_mapping: [] },
    ades: { service_key: "ades", service_name: "Ades", category: "OTP", execution_mode: "AUTHENTICATED_OTP", description: "Đọc OTP qua Ades Support.", base_url: "https://api-2026-02.ades.support", endpoints: { auth_token: "/ades-support/auth/token", only_otp: "/ades-support/only-otp", read_otp: "/mail/read-otp-gpm" }, auth_config: { timeoutMs: 12_000 }, field_mapping: [] },
    yuna_2fa: { service_key: "yuna_2fa", service_name: "Yuna 2FA", category: "OTP", execution_mode: "YUNA_2FA", description: "Tra cứu mã đơn và OTP Yuna.", base_url: "https://hub.yunagrp.com/2fa", endpoints: {}, auth_config: { timeoutMs: 10_000, defaultToken: String(process.env.YUNA_2FA_TOKEN || "") }, field_mapping: [] },
    yuna_mail: { service_key: "yuna_mail", service_name: "Yuna Mail", category: "OTP", execution_mode: "YUNA_MAIL", description: "Đọc OTP qua Yuna Mail.", base_url: "https://mail.yunagrp.com", endpoints: { rules: "https://mail.yunagrp.com/admin.php?public=rules", mail_api: "https://mail.yunagrp.com/api.php" }, auth_config: { timeoutMs: 12_000 }, field_mapping: [] },
    vivarocky_household: { service_key: "vivarocky_household", service_name: "VivaRocky Household", category: "NETFLIX", execution_mode: "VIVAROCKY_HTML", description: "Lấy link cập nhật Netflix Household.", base_url: "https://vivarocky.in/household.php", endpoints: {}, auth_config: { timeoutMs: 15_000 }, field_mapping: [{ key: "netflix_link", path: "netflix_link", label: "Link cập nhật Netflix" }] },
    vivarocky_six_digit: { service_key: "vivarocky_six_digit", service_name: "VivaRocky 6-Digit", category: "NETFLIX", execution_mode: "VIVAROCKY_HTML", description: "Lấy mã Netflix 6 chữ số.", base_url: "https://vivarocky.in/six_digit_login.php", endpoints: {}, auth_config: { timeoutMs: 15_000 }, field_mapping: [{ key: "otp", path: "otp", label: "Mã OTP", is_primary: true }] },
    vivarocky_signin: { service_key: "vivarocky_signin", service_name: "VivaRocky Sign-in", category: "NETFLIX", execution_mode: "VIVAROCKY_HTML", description: "Lấy mã đăng nhập Netflix.", base_url: "https://vivarocky.in/signin_code.php", endpoints: {}, auth_config: { timeoutMs: 15_000, access_code: String(process.env.VIVAROCKY_SIGNIN_ACCESS_CODE || "") }, field_mapping: [{ key: "otp", path: "otp", label: "Mã đăng nhập", is_primary: true }] },
    totp: { service_key: "totp", service_name: "TOTP", category: "2FA", execution_mode: "INTERNAL_TOTP", description: "Sinh mã TOTP nội bộ.", base_url: "", endpoints: {}, auth_config: {}, field_mapping: [] },
    warehouse_2fa: { service_key: "warehouse_2fa", service_name: "Warehouse 2FA", category: "2FA", execution_mode: "INTERNAL_WAREHOUSE_2FA", description: "Tra cứu 2FA kho nội bộ.", base_url: "", endpoints: {}, auth_config: {}, field_mapping: [] },
    imap: { service_key: "imap", service_name: "IMAP Mailbox", category: "OTP", execution_mode: "INTERNAL_IMAP", description: "Đọc OTP qua IMAP.", base_url: "", endpoints: {}, auth_config: getImapConfig(), field_mapping: [] },
  };
  return configs[providerKey] ? { ...configs[providerKey] } : null;
}

function assertImapConfigured(config) {
  if (!config.host || !config.user || !config.password) {
    const error = new Error("IMAP_PROVIDER_NOT_CONFIGURED");
    error.code = "IMAP_PROVIDER_NOT_CONFIGURED";
    throw error;
  }
}

function isProviderConfigured(key) {
  const config = providerConfig(key);
  if (!config) return false;
  if (config.service_key === "imap") { const imap = getImapConfig(); return Boolean(imap.host && imap.user && imap.password); }
  if (config.service_key === "vivarocky_signin") return Boolean(config.auth_config.access_code);
  return true;
}

module.exports = { PROVIDER_KEY_ALIASES, providerConfig, getImapConfig, assertImapConfigured, isProviderConfigured };
