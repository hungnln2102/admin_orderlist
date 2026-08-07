exports.up = function(knex) {
  return knex.schema.withSchema('finance').table('store_profit_expenses', function(table) {
    table.string('status', 50).notNullable().defaultTo('completed');
  });
};

exports.down = function(knex) {
  return knex.schema.withSchema('finance').table('store_profit_expenses', function(table) {
    table.dropColumn('status');
  });
};
