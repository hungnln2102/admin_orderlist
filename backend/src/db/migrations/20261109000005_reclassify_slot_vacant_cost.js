const FINANCE_SCHEMA = process.env.DB_SCHEMA_FINANCE || "finance";

exports.up = async function up(knex) {
  await knex.raw(`
    UPDATE ${FINANCE_SCHEMA}.daily_revenue_summary
    SET total_shop_cost = total_shop_cost - slot_vacant_cost
    WHERE COALESCE(slot_vacant_cost, 0) <> 0;
  `);
};

exports.down = async function down(knex) {
  await knex.raw(`
    UPDATE ${FINANCE_SCHEMA}.daily_revenue_summary
    SET total_shop_cost = total_shop_cost + slot_vacant_cost
    WHERE COALESCE(slot_vacant_cost, 0) <> 0;
  `);
};
