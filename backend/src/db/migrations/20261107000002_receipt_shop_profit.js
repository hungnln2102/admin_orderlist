const { TABLES } = require("../tables");

exports.up = async function (knex) {
  await knex.raw(`
    CREATE TABLE ?? (
      id BIGSERIAL PRIMARY KEY,
      target_type VARCHAR(30) NOT NULL,
      target_id BIGINT NOT NULL,
      period_month VARCHAR(7) NOT NULL,
      amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (target_type, target_id, period_month)
    );
    ALTER TABLE ??
      ADD COLUMN financial_account_id BIGINT REFERENCES ??(id),
      ADD COLUMN shop_out_expense_id BIGINT UNIQUE REFERENCES ??(id);
    ALTER TABLE ??
      ADD COLUMN profit_covered_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (profit_covered_amount >= 0 AND profit_covered_amount <= amount),
      ADD COLUMN profit_snapshot_id BIGINT REFERENCES ??(id);
    ALTER TABLE ?? ADD COLUMN receipt_allocation_id BIGINT REFERENCES ??(id);
    CREATE UNIQUE INDEX uq_shop_out_profit_receipt ON ?? (payment_receipt_id)
      WHERE expense_meta->>'source' = 'shop_out';
  `, [
    TABLES.PROFIT_OBLIGATION_SNAPSHOTS,
    TABLES.PAYMENT_RECEIPT, TABLES.FINANCIAL_ACCOUNTS, TABLES.STORE_PROFIT_EXPENSES,
    TABLES.PAYMENT_RECEIPT_ALLOCATIONS, TABLES.PROFIT_OBLIGATION_SNAPSHOTS,
    TABLES.DEBT_PAYMENT_LOGS, TABLES.PAYMENT_RECEIPT_ALLOCATIONS,
    TABLES.STORE_PROFIT_EXPENSES,
  ]);
};

exports.down = async function (knex) {
  const linkedReceipt = await knex(TABLES.PAYMENT_RECEIPT).whereNotNull("shop_out_expense_id").first();
  const snapshot = await knex(TABLES.PROFIT_OBLIGATION_SNAPSHOTS).first();
  if (linkedReceipt || snapshot) throw new Error("Cannot roll back receipt profit migration with accounting data");
  const expenseSchema = TABLES.STORE_PROFIT_EXPENSES.split(".").slice(0, -1).join(".");
  await knex.raw("DROP INDEX IF EXISTS ??", [expenseSchema ? expenseSchema + ".uq_shop_out_profit_receipt" : "uq_shop_out_profit_receipt"]);
  await knex.raw("ALTER TABLE ?? DROP COLUMN receipt_allocation_id", [TABLES.DEBT_PAYMENT_LOGS]);
  await knex.raw("ALTER TABLE ?? DROP COLUMN profit_covered_amount, DROP COLUMN profit_snapshot_id", [TABLES.PAYMENT_RECEIPT_ALLOCATIONS]);
  await knex.raw("ALTER TABLE ?? DROP COLUMN shop_out_expense_id, DROP COLUMN financial_account_id", [TABLES.PAYMENT_RECEIPT]);
  await knex.schema.dropTable(TABLES.PROFIT_OBLIGATION_SNAPSHOTS);
};
