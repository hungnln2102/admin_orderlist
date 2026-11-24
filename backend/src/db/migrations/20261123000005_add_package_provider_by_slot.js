const { TABLES, COLS } = require("../tables");

const column = COLS.PACKAGE_PRODUCT.PROVIDER_BY_SLOT;

exports.up = async (knex) => {
  await knex.raw("ALTER TABLE ?? ADD COLUMN ?? jsonb CHECK (jsonb_typeof(??) = 'object')",
    [TABLES.PACKAGE_PRODUCT, column, column]);
};

exports.down = async (knex) => {
  await knex.raw("ALTER TABLE ?? DROP COLUMN ??", [TABLES.PACKAGE_PRODUCT, column]);
};
