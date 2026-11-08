const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_SYSTEM_AUTOMATION || "system_automation";

const MISSING_EXTERNAL_APIS = [
  {
    service_key: "vivarocky_household",
    service_name: "Viva Rocky: Link TV / Hộ Gia Đình",
    category: "NETFLIX",
    description: "Lấy link cập nhật TV / Household Netflix từ https://vivarocky.in/household.php",
    base_url: "https://vivarocky.in/household.php",
    endpoints: JSON.stringify({}),
    auth_config: JSON.stringify({
      method: "POST",
      timeoutMs: 15000,
    }),
    field_mapping: JSON.stringify([
      { key: "netflix_link", path: "netflix_link", label: "Link Cập Nhật Netflix" },
    ]),
    is_active: true,
  },
  {
    service_key: "vivarocky_six_digit",
    service_name: "Viva Rocky: Mã Xác Minh 6 Số",
    category: "NETFLIX",
    description: "Lấy mã xác minh 6 số Netflix từ https://vivarocky.in/six_digit_login.php",
    base_url: "https://vivarocky.in/six_digit_login.php",
    endpoints: JSON.stringify({}),
    auth_config: JSON.stringify({
      method: "POST",
      timeoutMs: 15000,
    }),
    field_mapping: JSON.stringify([
      { key: "otp", path: "otp", label: "Mã OTP 6 Số", is_primary: true },
    ]),
    is_active: true,
  },
  {
    service_key: "vivarocky_signin",
    service_name: "Viva Rocky: Sign-in Code",
    category: "NETFLIX",
    description: "Lấy mã đăng nhập nhanh Sign-in Code Netflix từ https://vivarocky.in/signin_code.php",
    base_url: "https://vivarocky.in/signin_code.php",
    endpoints: JSON.stringify({}),
    auth_config: JSON.stringify({
      token: "mvrk56",
      method: "POST",
      timeoutMs: 15000,
      access_code: "mvrk56",
    }),
    field_mapping: JSON.stringify([
      { key: "otp", path: "otp", label: "Mã OTP Đăng Nhập", is_primary: true },
    ]),
    is_active: true,
  },
  {
    service_key: "totp",
    service_name: "Cỗ Máy TOTP (Google Authenticator 2FA)",
    category: "2FA",
    description: "Bộ sinh mã xác thực 2 bước 6 số tự động từ Secret Key Base32 (chuẩn quốc tế RFC 6238).",
    base_url: "https://api.mavrykpremium.com/system/totp",
    endpoints: JSON.stringify({
      generate: "/generate",
    }),
    auth_config: JSON.stringify({
      type: "internal",
      method: "LOCAL",
    }),
    field_mapping: JSON.stringify([
      { key: "otp", path: "code", label: "Mã 2FA (6 Số)", is_primary: true },
      { key: "remaining_seconds", path: "remainingSeconds", label: "Thời gian còn lại (s)", is_primary: false },
    ]),
    is_active: true,
  },
  {
    service_key: "warehouse_2fa",
    service_name: "Kho Hàng: Tra Cứu 2FA (Warehouse 2FA)",
    category: "2FA",
    description: "Tự động tra cứu mã 2FA từ Kho Hàng theo Email/Username hoặc Đơn hàng và sinh mã OTP 6 số.",
    base_url: "https://api.mavrykpremium.com/system/warehouse-2fa",
    endpoints: JSON.stringify({
      lookup: "/lookup",
    }),
    auth_config: JSON.stringify({
      type: "internal",
      method: "LOCAL",
    }),
    field_mapping: JSON.stringify([
      { key: "otp", path: "code", label: "Mã 2FA (6 Số)", is_primary: true },
      { key: "account_username", path: "account_username", label: "Tài khoản kho", is_primary: false },
      { key: "remaining_seconds", path: "remainingSeconds", label: "Thời gian còn lại (s)", is_primary: false },
    ]),
    is_active: true,
  },
];

const DEFAULT_SLOTS = [
  {
    slot_key: "adobe_otp",
    name: "Adobe: Lấy Mã OTP 6 Số",
    category: "adobe",
    assigned_services: ["fix_ades", "tinyhost"],
    cooldown_seconds: 30,
    btn_text: "Lấy Mã OTP Adobe",
    input_placeholder: "Nhập địa chỉ Email Adobe (VD: user@domain.com)...",
    enabled: true,
  },
  {
    slot_key: "adobe_account",
    name: "Adobe: Tra Cứu Tài Khoản",
    category: "adobe",
    assigned_services: ["yuna_2fa"],
    cooldown_seconds: 15,
    btn_text: "Tra Cứu Thông Tin",
    input_placeholder: "Nhập Email hoặc Mã Đơn Hàng...",
    enabled: true,
  },
  {
    slot_key: "netflix_household",
    name: "Netflix: Link TV / Hộ Gia Đình",
    category: "netflix",
    assigned_services: ["vivarocky_household", "fix_ades", "tmail_webmail"],
    cooldown_seconds: 45,
    btn_text: "Lấy Link Cập Nhật TV",
    input_placeholder: "Nhập Email tài khoản Netflix...",
    enabled: true,
  },
  {
    slot_key: "netflix_six_digit",
    name: "Netflix: Mã Xác Minh 6 Số",
    category: "netflix",
    assigned_services: ["vivarocky_six_digit", "fix_ades", "tinyhost"],
    cooldown_seconds: 30,
    btn_text: "Lấy Mã 6 Số Netflix",
    input_placeholder: "Nhập Email tài khoản Netflix...",
    enabled: true,
  },
  {
    slot_key: "netflix_login_otp",
    name: "Netflix: OTP Đăng Nhập",
    category: "netflix",
    assigned_services: ["vivarocky_signin", "fix_ades", "tmail_webmail"],
    cooldown_seconds: 30,
    btn_text: "Lấy OTP Đăng Nhập",
    input_placeholder: "Nhập Email tài khoản Netflix...",
    enabled: true,
  },
  {
    slot_key: "gpt_otp",
    name: "ChatGPT: Mã Xác Minh OpenAI",
    category: "gpt",
    assigned_services: ["warehouse_2fa", "tinyhost"],
    cooldown_seconds: 30,
    btn_text: "Lấy OTP ChatGPT",
    input_placeholder: "Nhập Email tài khoản OpenAI / ChatGPT...",
    enabled: true,
  },
  {
    slot_key: "gpt_account",
    name: "ChatGPT: Tra Cứu Tài Khoản",
    category: "gpt",
    assigned_services: ["warehouse_2fa", "yuna_2fa"],
    cooldown_seconds: 15,
    btn_text: "Tra Cứu Tài Khoản",
    input_placeholder: "Nhập Email mua hàng hoặc Mã đơn hàng...",
    enabled: true,
  },
  {
    slot_key: "two_factor_totp",
    name: "2FA: Sinh Mã TOTP",
    category: "2fa",
    assigned_services: ["totp", "yuna_2fa"],
    cooldown_seconds: 10,
    btn_text: "Lấy Mã 2FA (6 Số)",
    input_placeholder: "Nhập Secret Key 2FA (VD: JBSWY3DPEHPK3PXP)...",
    enabled: true,
  },
];

exports.up = async (knex) => {
  // 1. Chèn các cổng API còn thiếu vào external_api_configs
  const hasConfigs = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("external_api_configs");
  if (hasConfigs) {
    await knex
      .withSchema(SYSTEM_SCHEMA)
      .table("external_api_configs")
      .insert(MISSING_EXTERNAL_APIS)
      .onConflict("service_key")
      .ignore();
  }

  // 2. Chèn cấu hình slot OTP_PORTAL_SLOTS_CONFIG vào system_configs nếu chưa có
  const hasSystemConfigs = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("system_configs");
  if (hasSystemConfigs) {
    const existing = await knex
      .withSchema(SYSTEM_SCHEMA)
      .table("system_configs")
      .where("config_key", "OTP_PORTAL_SLOTS_CONFIG")
      .first();

    if (!existing) {
      await knex
        .withSchema(SYSTEM_SCHEMA)
        .table("system_configs")
        .insert({
          config_key: "OTP_PORTAL_SLOTS_CONFIG",
          config_value: JSON.stringify(DEFAULT_SLOTS),
          data_type: "JSON",
          group_name: "PORTAL",
          description: "Cấu hình danh mục và phân bổ cổng API cho các ô input trên OTP Portal",
          updated_by: "SYSTEM",
        });
    }
  }
};

exports.down = async (knex) => {
  const hasConfigs = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("external_api_configs");
  if (hasConfigs) {
    await knex
      .withSchema(SYSTEM_SCHEMA)
      .table("external_api_configs")
      .whereIn(
        "service_key",
        MISSING_EXTERNAL_APIS.map((api) => api.service_key)
      )
      .del();
  }
};
