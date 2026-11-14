/**
 * 20261114000001_create_portal_slot_routing_rules.js
 *
 * Migration tạo bảng portal_slot_routing_rules để định tuyến thông minh:
 * [Ô Input Web (slot_key)] + [Sản Phẩm Kho (product_name_id)] + [NCC (supplier_id)] -> [Cổng Provider API (provider_key)].
 * Cho phép tự động điều hướng khách hàng tới chính xác Provider của NCC khi nhập email / mã đơn trên Web OTP Portal.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";
  const WAREHOUSE_SCHEMA = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";
  const PARTNER_SCHEMA = process.env.DB_SCHEMA_PARTNER || process.env.SCHEMA_PARTNER || "business";
  const ORDERS_SCHEMA = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "business";

  // 1. Tạo bảng portal_slot_routing_rules
  const tableExists = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("portal_slot_routing_rules");
  if (!tableExists) {
    await knex.schema.withSchema(SYSTEM_SCHEMA).createTable("portal_slot_routing_rules", (table) => {
      table.bigIncrements("id").primary();
      table.string("slot_key", 100).notNullable();
      table
        .bigInteger("product_name_id")
        .notNullable()
        .references("id")
        .inTable(`${WAREHOUSE_SCHEMA}.product_names`)
        .onDelete("CASCADE");
      table
        .bigInteger("supplier_id")
        .nullable()
        .references("id")
        .inTable(`${PARTNER_SCHEMA}.supplier`)
        .onDelete("CASCADE");
      table.string("provider_key", 100).notNullable();
      table.integer("priority").notNullable().defaultTo(1);
      table.boolean("is_active").notNullable().defaultTo(true);
      table.text("note").nullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.index(["slot_key", "product_name_id", "supplier_id"]);
      table.index(["product_name_id"]);
      table.index(["supplier_id"]);
    });
  }

  // 2. Thêm functional index cho order_list để tra cứu đơn hàng theo email/mã đơn siêu tốc (< 2ms)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_order_list_info_lower
      ON ${ORDERS_SCHEMA}.order_list (LOWER(information_order));

    CREATE INDEX IF NOT EXISTS idx_order_list_id_order_lower
      ON ${ORDERS_SCHEMA}.order_list (LOWER(id_order));
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";
  const ORDERS_SCHEMA = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "business";

  await knex.schema.withSchema(SYSTEM_SCHEMA).dropTableIfExists("portal_slot_routing_rules");

  await knex.raw(`
    DROP INDEX IF EXISTS ${ORDERS_SCHEMA}.idx_order_list_info_lower;
    DROP INDEX IF EXISTS ${ORDERS_SCHEMA}.idx_order_list_id_order_lower;
  `);
};
