const FINANCE_SCHEMA = process.env.DB_SCHEMA_FINANCE || "finance";

/**
 * Migration: Bổ sung các cột phục vụ đối chiếu thẻ ngân hàng (4 số cuối)
 * và thanh toán hóa đơn / quẹt thẻ trực tiếp cho app thông báo & email automation.
 * Đảm bảo tính nhất quán ACID với unique partial index trên reference_code.
 */
exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${FINANCE_SCHEMA}.personal_assets
      ADD COLUMN IF NOT EXISTS card_last_digits VARCHAR(10),
      ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);

    CREATE INDEX IF NOT EXISTS idx_personal_assets_card_last_digits
      ON ${FINANCE_SCHEMA}.personal_assets(card_last_digits);

    ALTER TABLE ${FINANCE_SCHEMA}.debt_payment_logs
      ADD COLUMN IF NOT EXISTS reference_code VARCHAR(100),
      ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(255);

    CREATE UNIQUE INDEX IF NOT EXISTS uq_debt_payment_logs_reference_code
      ON ${FINANCE_SCHEMA}.debt_payment_logs(reference_code)
      WHERE reference_code IS NOT NULL;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS ${FINANCE_SCHEMA}.uq_debt_payment_logs_reference_code;
    DROP INDEX IF EXISTS ${FINANCE_SCHEMA}.idx_personal_assets_card_last_digits;

    ALTER TABLE ${FINANCE_SCHEMA}.debt_payment_logs
      DROP COLUMN IF EXISTS reference_code,
      DROP COLUMN IF EXISTS merchant_name;

    ALTER TABLE ${FINANCE_SCHEMA}.personal_assets
      DROP COLUMN IF EXISTS card_last_digits,
      DROP COLUMN IF EXISTS bank_name;
  `);
};
