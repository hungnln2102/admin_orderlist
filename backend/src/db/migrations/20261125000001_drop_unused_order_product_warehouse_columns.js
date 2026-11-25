const schemaBusiness = process.env.DB_SCHEMA_BUSINESS || "business";
const schemaOrders = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || schemaBusiness;
const schemaProduct = process.env.DB_SCHEMA_PRODUCT || process.env.SCHEMA_PRODUCT || schemaBusiness;
const schemaWarehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";

exports.config = { transaction: true };

exports.up = async (knex) => {
  await knex.raw(
    "LOCK TABLE ??.??, ??.??, ??.?? IN ACCESS EXCLUSIVE MODE",
    [schemaOrders, "order_list", schemaProduct, "variant", schemaWarehouse, "accounts"]
  );

  const columns = [
    [schemaOrders, "order_list", "usdt_wallet_id"],
    [schemaProduct, "variant", "id_desc"],
    [schemaWarehouse, "accounts", "account_identifier", "account_username"],
  ];

  for (const [schema, table, column, retainedColumn] of columns) {
    const candidates = knex(table).withSchema(schema).whereNotNull(column);
    if (retainedColumn) {
      candidates.whereRaw("?? IS DISTINCT FROM ??", [column, retainedColumn]);
    }
    const row = await candidates.first(knex.raw("1"));
    if (row) {
      throw new Error(`Cannot drop ${schema}.${table}.${column}: existing values must be preserved`);
    }
  }

  for (const [schema, table, column] of columns) {
    await knex.raw("ALTER TABLE ??.?? DROP COLUMN ?? RESTRICT", [schema, table, column]);
  }
};

exports.down = async (knex) => {
  await knex.schema.withSchema(schemaOrders).alterTable("order_list", (table) => {
    table.bigInteger("usdt_wallet_id");
  });
  await knex.schema.withSchema(schemaProduct).alterTable("variant", (table) => {
    table.string("id_desc", 100);
  });
  await knex.schema.withSchema(schemaWarehouse).alterTable("accounts", (table) => {
    table.string("account_identifier", 255);
  });
};
