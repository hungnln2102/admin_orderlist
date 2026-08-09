/**
 * Tạo bảng business.order_bank_accounts liên kết đơn nhập hàng với tài khoản cửa hàng.
 */

const SQL_UP = `
CREATE TABLE IF NOT EXISTS business.order_bank_accounts (
  order_id integer NOT NULL PRIMARY KEY REFERENCES business.order_list(id) ON DELETE CASCADE,
  shop_bank_account_id integer NOT NULL REFERENCES finance.financial_accounts(id) ON DELETE CASCADE
);

COMMENT ON TABLE business.order_bank_accounts IS
  'Bảng liên kết đơn nhập hàng với tài khoản ngân hàng của cửa hàng dùng để thanh toán.';
`;

const SQL_DOWN = `
DROP TABLE IF EXISTS business.order_bank_accounts;
`;

exports.up = async function up(knex) {
  await knex.raw(SQL_UP);
};

exports.down = async function down(knex) {
  await knex.raw(SQL_DOWN);
};

