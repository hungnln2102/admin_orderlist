const SCHEMA = "partner";
const TABLE_NAME = "supplier_payments";

exports.up = async function up(knex) {
  // 1. Add total_import column if not exists
  const hasColumn = await knex.schema.withSchema(SCHEMA).hasColumn(TABLE_NAME, "total_import");
  if (!hasColumn) {
    await knex.schema.withSchema(SCHEMA).alterTable(TABLE_NAME, (table) => {
      table.decimal("total_import", 18, 2).defaultTo(0).notNullable();
    });
  }

  // 2. Drop unique index uq_supplier_payments_supplier_id if exists
  await knex.schema.raw(`
    DROP INDEX IF EXISTS ${SCHEMA}.uq_supplier_payments_supplier_id;
  `);
};

exports.down = async function down(knex) {
  // 1. Drop total_import column if exists
  const hasColumn = await knex.schema.withSchema(SCHEMA).hasColumn(TABLE_NAME, "total_import");
  if (hasColumn) {
    await knex.schema.withSchema(SCHEMA).alterTable(TABLE_NAME, (table) => {
      table.dropColumn("total_import");
    });
  }

  // 2. Check for duplicate supplier_id values
  const duplicates = await knex(SCHEMA + "." + TABLE_NAME)
    .groupBy("supplier_id")
    .havingRaw("count(*) > 1")
    .select("supplier_id");

  if (duplicates.length === 0) {
    await knex.schema.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_payments_supplier_id ON ${SCHEMA}.${TABLE_NAME} (supplier_id);
    `);
  } else {
    console.warn("Could not recreate unique index because of duplicate supplier payments, creating non-unique index instead.");
    await knex.schema.raw(`
      CREATE INDEX IF NOT EXISTS uq_supplier_payments_supplier_id ON ${SCHEMA}.${TABLE_NAME} (supplier_id);
    `);
  }
};
