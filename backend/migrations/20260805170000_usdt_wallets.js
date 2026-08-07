/**
 * Bảng admin.usdt_wallets + admin.usdt_wallet_ledger.
 * SQL đồng bộ: database/migrations/109_usdt_wallets.sql
 */

const SQL_UP = `
-- Ví USDT shop (nhận thanh toán đơn hàng thủ công).
CREATE SEQUENCE IF NOT EXISTS admin.usdt_wallets_id_seq
  START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS admin.usdt_wallets (
  id integer NOT NULL DEFAULT nextval('admin.usdt_wallets_id_seq'::regclass),
  label text,
  wallet_address text NOT NULL,
  network text NOT NULL DEFAULT 'TRC20',
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  total_received numeric(18,4) NOT NULL DEFAULT 0,
  total_withdrawn numeric(18,4) NOT NULL DEFAULT 0,
  balance numeric(18,4) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usdt_wallets_pkey PRIMARY KEY (id),
  CONSTRAINT usdt_wallets_address_nonempty CHECK (TRIM(wallet_address) <> ''),
  CONSTRAINT usdt_wallets_network_nonempty CHECK (TRIM(network) <> '')
);

ALTER SEQUENCE admin.usdt_wallets_id_seq OWNED BY admin.usdt_wallets.id;

CREATE INDEX IF NOT EXISTS idx_usdt_wallets_active
  ON admin.usdt_wallets (is_active)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usdt_wallets_one_default
  ON admin.usdt_wallets (is_default)
  WHERE is_default = true AND is_active = true;

COMMENT ON TABLE admin.usdt_wallets IS
  'Ví USDT shop nhận thanh toán đơn hàng (thủ công). Số dư theo USD.';

-- Ledger ví USDT.
CREATE SEQUENCE IF NOT EXISTS admin.usdt_wallet_ledger_id_seq
  START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS admin.usdt_wallet_ledger (
  id integer NOT NULL DEFAULT nextval('admin.usdt_wallet_ledger_id_seq'::regclass),
  usdt_wallet_id integer NOT NULL REFERENCES admin.usdt_wallets(id),
  entry_type text NOT NULL,
  amount numeric(18,4) NOT NULL,
  signed_amount numeric(18,4) NOT NULL,
  balance_after numeric(18,4) NOT NULL,
  source_kind text,
  source_id text,
  exchange_rate numeric(18,2),
  vnd_equivalent numeric(18,0),
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usdt_wallet_ledger_pkey PRIMARY KEY (id),
  CONSTRAINT usdt_wallet_ledger_amount_positive CHECK (amount > 0)
);

ALTER SEQUENCE admin.usdt_wallet_ledger_id_seq OWNED BY admin.usdt_wallet_ledger.id;

CREATE INDEX IF NOT EXISTS idx_usdt_wallet_ledger_wallet
  ON admin.usdt_wallet_ledger (usdt_wallet_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usdt_wallet_ledger_source_dedupe
  ON admin.usdt_wallet_ledger (source_kind, source_id)
  WHERE source_kind IS NOT NULL AND source_id IS NOT NULL;

COMMENT ON TABLE admin.usdt_wallet_ledger IS
  'Sổ cái ví USDT: deposit_in (đơn hàng), withdraw (rút tiền).';
`;

exports.up = async function up(knex) {
  await knex.raw(SQL_UP);
};

exports.down = async function down() {
  // Bảng đã dùng trong ứng dụng — không tự gỡ an toàn.
};
