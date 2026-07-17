const fs = require('fs');
const path = require('path');

exports.up = function(knex) {
  const sqlPath = path.join(__dirname, '../../database/migrations/113_import_package_rules.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  return knex.raw(sql);
};

exports.down = function(knex) {
  return knex.schema.withSchema('product').dropTableIfExists('import_package_rules');
};
