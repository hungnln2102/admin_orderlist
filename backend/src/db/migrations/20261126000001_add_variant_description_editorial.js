const { SCHEMAS, TABLES } = require("../tables");

const revisionTable = "variant_description_revision";

exports.up = async function up(knex) {
  await knex.schema.withSchema(SCHEMAS.PRODUCT).alterTable("variant", (table) => {
    table.text("editorial_html");
    table.string("editorial_status", 32);
    table.integer("editorial_version").notNullable().defaultTo(0);
    table.text("editorial_note");
    table.integer("description_published_version");
  });
  await knex.schema.withSchema(SCHEMAS.PRODUCT).createTable(revisionTable, (table) => {
    table.increments("id");
    table.bigInteger("variant_id").notNullable().references("id").inTable(TABLES.VARIANT).onDelete("CASCADE");
    table.integer("version").notNullable();
    table.text("html").notNullable();
    table.string("action", 32).notNullable();
    table.text("note");
    table.text("actor").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["variant_id", "version"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.withSchema(SCHEMAS.PRODUCT).dropTable(revisionTable);
  await knex.schema.withSchema(SCHEMAS.PRODUCT).alterTable("variant", (table) => {
    table.dropColumns("editorial_html", "editorial_status", "editorial_version", "editorial_note", "description_published_version");
  });
};
