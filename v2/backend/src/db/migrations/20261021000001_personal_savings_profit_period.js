const { SCHEMAS } = require("../tables");

exports.up = async function up(knex) {
  const schema = knex.schema.withSchema(SCHEMAS.FINANCE);
  const hasColumn = await schema.hasColumn("personal_savings", "profit_last_credited_period");

  if (!hasColumn) {
    await schema.alterTable("personal_savings", (table) => {
      table.string("profit_last_credited_period", 10).nullable();
    });
  }
};

exports.down = async function down(knex) {
  const schema = knex.schema.withSchema(SCHEMAS.FINANCE);
  const hasColumn = await schema.hasColumn("personal_savings", "profit_last_credited_period");

  if (hasColumn) {
    await schema.alterTable("personal_savings", (table) => {
      table.dropColumn("profit_last_credited_period");
    });
  }
};
