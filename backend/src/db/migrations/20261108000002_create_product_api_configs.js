/**
 * 20261108000002_create_product_api_configs.js
 *
 * Migration tạo bảng product_api_configs để liên kết động N-N giữa Sản phẩm (product)
 * và Cổng API bên thứ 3 (external_api_configs), giúp phân bổ danh mục OTP động xuống các biến thể (variants).
 * Đồng thời bổ sung cột otp_type vào warehouse.account_slots.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const BUSINESS_SCHEMA = process.env.DB_SCHEMA_PRODUCT || process.env.DB_SCHEMA_BUSINESS || "business";
  const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";
  const WAREHOUSE_SCHEMA = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";

  // 1. Tạo bảng business.product_api_configs
  const tableExists = await knex.schema.withSchema(BUSINESS_SCHEMA).hasTable("product_api_configs");
  if (!tableExists) {
    await knex.schema.withSchema(BUSINESS_SCHEMA).createTable("product_api_configs", (table) => {
      table.bigIncrements("id").primary();
      table
        .bigInteger("product_id")
        .notNullable()
        .references("id")
        .inTable(`${BUSINESS_SCHEMA}.product`)
        .onDelete("CASCADE");
      table
        .bigInteger("api_config_id")
        .notNullable()
        .references("id")
        .inTable(`${SYSTEM_SCHEMA}.external_api_configs`)
        .onDelete("CASCADE");
      table.boolean("is_default").notNullable().defaultTo(false);
      table.boolean("is_active").notNullable().defaultTo(true);
      table.integer("sort_order").notNullable().defaultTo(0);
      table.text("note").nullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.unique(["product_id", "api_config_id"]);
      table.index(["product_id"]);
      table.index(["api_config_id"]);
    });
  }

  // 2. Thêm cột otp_type vào warehouse.account_slots
  await knex.raw(`
    ALTER TABLE ${WAREHOUSE_SCHEMA}.account_slots
      ADD COLUMN IF NOT EXISTS otp_type VARCHAR(100);

    CREATE INDEX IF NOT EXISTS idx_warehouse_account_slots_otp_type
      ON ${WAREHOUSE_SCHEMA}.account_slots (otp_type);
  `);

  // 3. Seed dữ liệu ban đầu cho 3 sản phẩm hiện hành (Adobe, Netflix, Chat GPT)
  try {
    const apiRows = await knex(`${SYSTEM_SCHEMA}.external_api_configs`).select("id", "service_key");
    const apiMap = new Map(apiRows.map((r) => [r.service_key, r.id]));

    const productRows = await knex(`${BUSINESS_SCHEMA}.product`).select("id", "package_name");
    const productMap = new Map(productRows.map((p) => [String(p.package_name || "").toLowerCase().trim(), p.id]));

    const initialMappings = [
      // Adobe (id = 1 hoặc tìm theo package_name 'Adobe')
      {
        productKey: "adobe",
        fallbackProductId: 1,
        apis: [
          { key: "fix_ades", isDefault: true, sort: 1 },
          { key: "tinyhost", isDefault: false, sort: 2 },
          { key: "yuna_mail", isDefault: false, sort: 3 },
          { key: "yuna_2fa", isDefault: false, sort: 4 },
        ],
      },
      // Netflix (id = 29 hoặc tìm theo package_name 'Netflix')
      {
        productKey: "netflix",
        fallbackProductId: 29,
        apis: [
          { key: "vivarocky_household", isDefault: true, sort: 1 },
          { key: "vivarocky_six_digit", isDefault: false, sort: 2 },
          { key: "vivarocky_signin", isDefault: false, sort: 3 },
        ],
      },
      // Chat GPT (id = 7 hoặc tìm theo package_name 'Chat GPT')
      {
        productKey: "chat gpt",
        fallbackProductId: 7,
        apis: [
          { key: "warehouse_2fa", isDefault: true, sort: 1 },
          { key: "tinyhost", isDefault: false, sort: 2 },
          { key: "totp", isDefault: false, sort: 3 },
        ],
      },
    ];

    const recordsToInsert = [];
    for (const group of initialMappings) {
      const prodId = productMap.get(group.productKey) || group.fallbackProductId;
      if (!prodId) continue;

      for (const api of group.apis) {
        const apiId = apiMap.get(api.key);
        if (apiId) {
          recordsToInsert.push({
            product_id: prodId,
            api_config_id: apiId,
            is_default: api.isDefault,
            is_active: true,
            sort_order: api.sort,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }
    }

    if (recordsToInsert.length > 0) {
      await knex(`${BUSINESS_SCHEMA}.product_api_configs`)
        .insert(recordsToInsert)
        .onConflict(["product_id", "api_config_id"])
        .ignore();
    }
  } catch (seedErr) {
    console.warn("[Migration 20261108000002] Seed initial product_api_configs warning:", seedErr.message);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const BUSINESS_SCHEMA = process.env.DB_SCHEMA_PRODUCT || process.env.DB_SCHEMA_BUSINESS || "business";
  const WAREHOUSE_SCHEMA = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";

  await knex.schema.withSchema(BUSINESS_SCHEMA).dropTableIfExists("product_api_configs");

  await knex.raw(`
    DROP INDEX IF EXISTS ${WAREHOUSE_SCHEMA}.idx_warehouse_account_slots_otp_type;
    ALTER TABLE ${WAREHOUSE_SCHEMA}.account_slots DROP COLUMN IF EXISTS otp_type;
  `);
};

