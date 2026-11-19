/**
 * Allow supplier-variant routing rules to omit the legacy product key.
 *
 * Older deployments used product_id while the current source migration used
 * product_name_id. Both keys are optional once a rule is identified by
 * supplier_id and variant_id.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const systemSchema = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";
  const tableName = "portal_slot_routing_rules";
  const legacyProductColumns = ["product_id", "product_name_id"];

  const tableExists = await knex.schema.withSchema(systemSchema).hasTable(tableName);
  if (!tableExists) return;

  for (const columnName of legacyProductColumns) {
    const column = await knex("information_schema.columns")
      .select("is_nullable")
      .where({ table_schema: systemSchema, table_name: tableName, column_name: columnName })
      .first();

    if (column?.is_nullable === "NO") {
      await knex.raw("ALTER TABLE ??.?? ALTER COLUMN ?? DROP NOT NULL", [
        systemSchema,
        tableName,
        columnName,
      ]);
    }
  }
};

/**
 * Reinstating a NOT NULL constraint would fail for valid variant-level rows.
 * Keep this migration safely irreversible instead of deleting operational data.
 *
 * @returns {Promise<void>}
 */
exports.down = async function () {};