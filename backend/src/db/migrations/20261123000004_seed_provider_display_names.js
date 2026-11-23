const schema = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";
const configKey = "OTP_PROVIDER_DISPLAY_NAMES";
const names = {
  tinyhost: "TinyHost",
  ades: "Ades-otp",
  fix_ades_status: "Fix-Ades",
  yuna_2fa: "Yuna 2FA",
  yuna_mail: "Yuna Mail",
  vivarocky_household: "VivaRocky Household",
  vivarocky_six_digit: "VivaRocky 6-Digit",
  vivarocky_signin: "VivaRocky Sign-in",
  totp: "TOTP",
  warehouse_2fa: "Warehouse 2FA",
  package_warehouse: "Kho Gói Sản Phẩm",
  imap: "IMAP Mailbox",
};

exports.up = async (knex) => {
  await knex.withSchema(schema).table("system_configs")
    .insert({
      config_key: configKey,
      config_value: JSON.stringify(names),
      data_type: "JSON",
      group_name: "OTP_PORTAL",
      description: "Tên hiển thị của các provider theo khóa dịch vụ.",
      updated_by: "MIGRATION",
    })
    .onConflict("config_key")
    .ignore();
};

// Keep administrative edits if the migration is rolled back and run again.
exports.down = async () => {};
