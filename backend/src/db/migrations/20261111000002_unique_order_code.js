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
  // Chuẩn hóa khoảng trắng id_order
  await knex.raw(`UPDATE ${schemaOrders}.order_list SET id_order = BTRIM(id_order) WHERE id_order IS NOT NULL AND id_order <> BTRIM(id_order)`);

  const duplicates = await duplicateQuery(knex);
  if (duplicates.length > 0) {
    for (const dup of duplicates) {
      const rows = await knex
        .withSchema(schemaOrders)
        .from("order_list")
        .select("id", "id_order")
        .whereRaw("UPPER(BTRIM(id_order)) = ?", [dup.normalized_id_order])
        .orderBy("id", "asc");

      for (let i = 1; i < rows.length; i++) {
        const baseCode = String(rows[0].id_order || "").trim();
        const suffix = `-${i + 1}`;
        await knex
          .withSchema(schemaOrders)
          .from("order_list")
          .where("id", rows[i].id)
          .update({ id_order: `${baseCode}${suffix}` });
      }
    }
  }

  await knex.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS ?? ON ?? (UPPER(BTRIM(??))) WHERE ?? IS NOT NULL AND BTRIM(??) <> ''",
    ["uq_order_list_id_order_upper_trim", schemaOrders + ".order_list", "id_order", "id_order", "id_order"],
  );
};

exports.down = async function (knex) {
  await knex.raw("DROP INDEX IF EXISTS ??", [schemaOrders + ".uq_order_list_id_order_upper_trim"]);
};