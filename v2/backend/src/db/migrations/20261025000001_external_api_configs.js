const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

const DEFAULT_EXTERNAL_APIS = [
  {
    service_key: "otp_hdsd",
    service_name: "OTP HDSD (otp.hdsd.net)",
    category: "OTP",
    description: "API lấy mã OTP tài khoản Adobe qua HTTP JSON từ otp.hdsd.net.",
    base_url: "https://otp.hdsd.net",
    endpoints: JSON.stringify({
      get_otp: "/get_otp_api",
    }),
    auth_config: JSON.stringify({
      type: "bearer_token",
      token: "",
      senderFilter: "adobe",
      timeoutMs: 10000,
    }),
    field_mapping: JSON.stringify([
      { key: "otp", label: "Mã OTP", path: "data.code" },
    ]),
    is_active: true,
  },
  {
    service_key: "tinyhost",
    service_name: "TinyHost Temp Mail",
    category: "OTP",
    description: "Đọc hòm thư tạm tinyhost.shop và tự động bóc tách mã xác minh OTP.",
    base_url: "https://tinyhost.shop",
    endpoints: JSON.stringify({
      list_emails: "/api/email/{domain}/{user}/",
      get_email: "/api/email/{domain}/{user}/{id}",
    }),
    auth_config: JSON.stringify({
      type: "none",
      timeoutMs: 15000,
      autoDelete: true,
      senderFilter: "adobe",
    }),
    field_mapping: JSON.stringify([]),
    is_active: true,
  },
  {
    service_key: "fix_ades",
    service_name: "Fix Ades Support (GPM API)",
    category: "OTP",
    description: "Đọc OTP tự động qua API GPM của Ades Support qua GET /mail/read-otp-gpm.",
    base_url: "https://api-2026-02.ades.support",
    endpoints: JSON.stringify({
      read_otp: "/mail/read-otp-gpm",
    }),
    auth_config: JSON.stringify({
      type: "none",
      timeoutMs: 10000,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }),
    field_mapping: JSON.stringify([]),
    is_active: true,
  },
  {
    service_key: "yuna_2fa",
    service_name: "Yuna 2FA Center",
    category: "OTP",
    description: "Tra cứu mã đơn hàng, lấy động api-token và đọc mã OTP 2FA từ YunaGRP.",
    base_url: "https://hub.yunagrp.com/2fa/",
    endpoints: JSON.stringify({}),
    auth_config: JSON.stringify({
      type: "meta_token",
      defaultToken: "",
      metaSelector: "meta[name='api-token']",
      timeoutMs: 10000,
    }),
    field_mapping: JSON.stringify([
      { key: "items", label: "Danh sách tài khoản", path: "items" },
      { key: "time_left", label: "Thời gian còn lại", path: "time_left" },
    ]),
    is_active: true,
  },
  {
    service_key: "yuna_mail",
    service_name: "Yuna Mail Rules & Scraper",
    category: "OTP",
    description: "Tải rules routing domain email và cào OTP cho tài khoản Yuna khi chưa có sẵn mã.",
    base_url: "https://mail.yunagrp.com",
    endpoints: JSON.stringify({
      rules: "https://mail.yunagrp.com/admin.php?public=rules",
      mail_api: "https://mail.yunagrp.com/api.php",
    }),
    auth_config: JSON.stringify({}),
    field_mapping: JSON.stringify([]),
    is_active: true,
  },
  {
    service_key: "tmail_webmail",
    service_name: "Tmail Webmail (wibucrypto)",
    category: "OTP",
    description: "Webmail tmail.wibucrypto.pro — cào OTP cho email @sluemone.xyz, @kaineapp.top.",
    base_url: "https://tmail.wibucrypto.pro",
    endpoints: JSON.stringify({
      mailbox: "/mailbox/{email}",
    }),
    auth_config: JSON.stringify({}),
    field_mapping: JSON.stringify([]),
    is_active: true,
  },
  {
    service_key: "generator_email",
    service_name: "Generator.email",
    category: "OTP",
    description: "Webmail generator.email — cào OTP cho email @rilzz.store và Microsoft fallback.",
    base_url: "https://generator.email",
    endpoints: JSON.stringify({
      mailbox: "/{email}",
    }),
    auth_config: JSON.stringify({}),
    field_mapping: JSON.stringify([]),
    is_active: true,
  },
  {
    service_key: "mail_imap",
    service_name: "IMAP / Webmail Backup (Inbox)",
    category: "OTP",
    description: "Đọc hộp thư đến IMAP bảo mật qua giao thức TLS/SSL và trích xuất mã OTP 6 số.",
    base_url: "imap://imap.secureserver.net:993",
    endpoints: JSON.stringify({}),
    auth_config: JSON.stringify({
      type: "imap_auth",
      host: "imap.secureserver.net",
      port: 993,
      secure: true,
      senderFilter: "adobe",
    }),
    field_mapping: JSON.stringify([]),
    is_active: true,
  },
];

exports.up = async (knex) => {
  await knex.raw("CREATE SCHEMA IF NOT EXISTS ??", [SYSTEM_SCHEMA]);
  await knex.schema.withSchema(SYSTEM_SCHEMA).createTable("external_api_configs", (table) => {
    table.increments("id").primary();
    table.string("service_key", 100).notNullable().unique();
    table.string("service_name", 255).notNullable();
    table.string("category", 50).notNullable().defaultTo("OTP");
    table.text("description").defaultTo("");
    table.text("base_url").notNullable();
    table.jsonb("endpoints").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.jsonb("auth_config").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.jsonb("field_mapping").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["service_key"]);
    table.index(["category"]);
  });

  await knex.withSchema(SYSTEM_SCHEMA).table("external_api_configs").insert(DEFAULT_EXTERNAL_APIS).onConflict("service_key").ignore();
};

exports.down = async (knex) => {
  await knex.schema.withSchema(SYSTEM_SCHEMA).dropTableIfExists("external_api_configs");
};
