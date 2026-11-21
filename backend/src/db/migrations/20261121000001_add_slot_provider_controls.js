const { TABLES, COLS } = require("../../db/tables");

const columns = COLS.ACCOUNT_SLOTS;

exports.up = (knex) => knex.schema.alterTable(TABLES.STOCK_SERVICES, (table) => {
  table.boolean(columns.OTP_ENABLED);
  table.boolean(columns.STATUS_CHECK_ENABLED);
  table.string(columns.STATUS_PROVIDER_KEY, 100);
});

exports.down = (knex) => knex.schema.alterTable(TABLES.STOCK_SERVICES, (table) => {
  table.dropColumns(columns.OTP_ENABLED, columns.STATUS_CHECK_ENABLED, columns.STATUS_PROVIDER_KEY);
});
