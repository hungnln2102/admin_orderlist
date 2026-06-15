-- Cho ph?p tr?ng STK kh?c ng?n h?ng, nh?ng ch?n tr?ng c?ng c?p STK + ng?n h?ng.
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_bank_accounts_account_number_bank_bin_unique
  ON admin.shop_bank_accounts (
    TRIM(REGEXP_REPLACE(account_number, '\s+', '', 'g')),
    TRIM(bank_bin)
  );
