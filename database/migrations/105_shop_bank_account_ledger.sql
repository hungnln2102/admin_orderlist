-- Ledger STK + số dư materialized (nguồn sự thật, không cộng từ biên lai runtime).
ALTER TABLE admin.shop_bank_accounts
  ADD COLUMN IF NOT EXISTS total_received numeric(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance numeric(18, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN admin.shop_bank_accounts.total_received IS
  'Tổng CK vào STK (cộng dồn qua ledger receipt_in).';
COMMENT ON COLUMN admin.shop_bank_accounts.balance IS
  'Số dư bank hiện tại = total_received − rút − nhập ngoài luồng (cập nhật qua ledger).';

CREATE TABLE IF NOT EXISTS admin.shop_bank_account_ledger (
  id bigserial NOT NULL,
  shop_bank_account_id integer NOT NULL,
  entry_type character varying(32) NOT NULL,
  amount numeric(18, 2) NOT NULL,
  signed_amount numeric(18, 2) NOT NULL,
  balance_after numeric(18, 2) NOT NULL DEFAULT 0,
  source_kind character varying(32),
  source_id bigint,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shop_bank_account_ledger_pkey PRIMARY KEY (id),
  CONSTRAINT shop_bank_account_ledger_account_fkey
    FOREIGN KEY (shop_bank_account_id) REFERENCES admin.shop_bank_accounts(id),
  CONSTRAINT shop_bank_account_ledger_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_shop_bank_account_ledger_account_id
  ON admin.shop_bank_account_ledger (shop_bank_account_id, id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_bank_account_ledger_source_unique
  ON admin.shop_bank_account_ledger (source_kind, source_id)
  WHERE source_kind IS NOT NULL AND source_id IS NOT NULL;

COMMENT ON TABLE admin.shop_bank_account_ledger IS
  'Sổ cái STK shop: receipt_in, withdraw, external_out.';

-- Gắn STK cho rút / nhập ngoài luồng dashboard.
-- Schema finance thực tế: dashboard (local) hoặc finance (prod) — Knex migration 20260821140000 tự resolve.
ALTER TABLE finance.com_profit_expenses
  ADD COLUMN IF NOT EXISTS shop_bank_account_id integer;

ALTER TABLE finance.com_profit_expenses
  DROP CONSTRAINT IF EXISTS store_profit_expenses_shop_bank_account_fkey;

ALTER TABLE finance.com_profit_expenses
  ADD CONSTRAINT store_profit_expenses_shop_bank_account_fkey
  FOREIGN KEY (shop_bank_account_id) REFERENCES admin.shop_bank_accounts(id);

-- Backfill một lần từ biên lai + total_withdrawn hiện có.
UPDATE admin.shop_bank_accounts s
SET
  total_received = COALESCE(r.sum_amount, 0),
  balance = COALESCE(r.sum_amount, 0) - COALESCE(s.total_withdrawn, 0)
FROM (
  SELECT
    TRIM(REGEXP_REPLACE(pr.receiver, '\s+', '', 'g')) AS stk_norm,
    SUM(pr.amount::numeric) AS sum_amount
  FROM receipt.payment_receipt pr
  WHERE COALESCE(TRIM(pr.receiver::text), '') <> ''
  GROUP BY TRIM(REGEXP_REPLACE(pr.receiver, '\s+', '', 'g'))
) r
WHERE TRIM(REGEXP_REPLACE(s.account_number, '\s+', '', 'g')) = r.stk_norm;
