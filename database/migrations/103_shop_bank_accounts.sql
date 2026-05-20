-- Tài khoản ngân hàng shop (STK nhận CK / VietQR).
CREATE SEQUENCE IF NOT EXISTS admin.shop_bank_accounts_id_seq
  START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS admin.shop_bank_accounts (
  id integer NOT NULL DEFAULT nextval('admin.shop_bank_accounts_id_seq'::regclass),
  label text,
  account_number text NOT NULL,
  account_holder text NOT NULL,
  bank_bin text NOT NULL,
  bank_short_code text,
  bank_display_name text,
  qr_note_prefix text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shop_bank_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT shop_bank_accounts_account_number_nonempty CHECK (TRIM(account_number) <> ''),
  CONSTRAINT shop_bank_accounts_account_holder_nonempty CHECK (TRIM(account_holder) <> ''),
  CONSTRAINT shop_bank_accounts_bank_bin_nonempty CHECK (TRIM(bank_bin) <> '')
);

ALTER SEQUENCE admin.shop_bank_accounts_id_seq OWNED BY admin.shop_bank_accounts.id;

CREATE INDEX IF NOT EXISTS idx_shop_bank_accounts_active
  ON admin.shop_bank_accounts (is_active)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_bank_accounts_one_default
  ON admin.shop_bank_accounts (is_default)
  WHERE is_default = true AND is_active = true;

COMMENT ON TABLE admin.shop_bank_accounts IS
  'STK shop nhận thanh toán đơn (VietQR). Một bản ghi is_default=true đang active.';
