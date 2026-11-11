const schemaOrders = process.env.DB_SCHEMA_ORDERS
  || process.env.SCHEMA_ORDERS
  || process.env.DB_SCHEMA_BUSINESS
  || "business";

const duplicateQuery = (knex) => knex
  .withSchema(schemaOrders)
  .from("order_list")
  .select(knex.raw("UPPER(BTRIM(??)) AS normalized_id_order", ["id_order"]))
  .count("* AS duplicate_count")
  .whereNotNull("id_order")
  .whereRaw("BTRIM(??) <> ''", ["id_order"])
  .groupByRaw("UPPER(BTRIM(??))", ["id_order"])
  .having(knex.raw("COUNT(*) > 1"));

exports.up = async function (knex) {
  const duplicates = await duplicateQuery(knex);
  if (duplicates.length > 0) {
    const details = duplicates.map((row) => String(row.normalized_id_order) + " (" + row.duplicate_count + ")").join(", ");
    throw new Error("Cannot add unique order code index; duplicate id_order values: " + details);
  }

  await knex.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS ?? ON ?? (UPPER(BTRIM(??))) WHERE ?? IS NOT NULL AND BTRIM(??) <> ''",
    ["uq_order_list_id_order_upper_trim", schemaOrders + ".order_list", "id_order", "id_order", "id_order"],
  );
};

exports.down = async function (knex) {
  await knex.raw("DROP INDEX IF EXISTS ??", [schemaOrders + ".uq_order_list_id_order_upper_trim"]);
};