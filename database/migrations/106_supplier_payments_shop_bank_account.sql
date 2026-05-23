-- Link chu ky thanh toan NCC voi STK shop dung de chi/nhan tien.
ALTER TABLE partner.supplier_payments
  ADD COLUMN IF NOT EXISTS shop_bank_account_id integer;

ALTER TABLE partner.supplier_payments
  DROP CONSTRAINT IF EXISTS supplier_payments_shop_bank_account_fkey;

ALTER TABLE partner.supplier_payments
  ADD CONSTRAINT supplier_payments_shop_bank_account_fkey
  FOREIGN KEY (shop_bank_account_id) REFERENCES admin.shop_bank_accounts(id);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_shop_bank_account_id
  ON partner.supplier_payments (shop_bank_account_id);
