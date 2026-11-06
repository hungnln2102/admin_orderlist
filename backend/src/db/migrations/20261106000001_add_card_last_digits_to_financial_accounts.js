/**
 * Migration thêm cột card_last_digits vào bảng finance.financial_accounts
 * Giúp lưu trữ 4 số cuối thẻ ATM/Debit gắn với tài khoản ngân hàng để đối soát giao dịch
 */
const FINANCE_SCHEMA = process.env.DB_SCHEMA_FINANCE || "finance";

exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${FINANCE_SCHEMA}.financial_accounts
    ADD COLUMN IF NOT EXISTS card_last_digits VARCHAR(10);

    CREATE INDEX IF NOT EXISTS idx_financial_accounts_card_last_digits
    ON ${FINANCE_SCHEMA}.financial_accounts(card_last_digits);
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS ${FINANCE_SCHEMA}.idx_financial_accounts_card_last_digits;

    ALTER TABLE ${FINANCE_SCHEMA}.financial_accounts
    DROP COLUMN IF EXISTS card_last_digits;
  `);
};
