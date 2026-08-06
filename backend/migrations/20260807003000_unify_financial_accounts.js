exports.up = async function (knex) {
  await knex.raw(`
    -- 1. Create the unified financial_accounts table
    CREATE TABLE finance.financial_accounts (
      id integer NOT NULL PRIMARY KEY,
      account_type varchar(20) NOT NULL, -- 'bank' or 'usdt'
      label text,
      account_number text NOT NULL,
      account_holder text,
      bank_bin text,
      bank_short_code text,
      bank_display_name text,
      qr_note_prefix text,
      is_default boolean DEFAULT false,
      is_active boolean DEFAULT true,
      total_withdrawn numeric(15,2) DEFAULT 0,
      total_received numeric(15,2) DEFAULT 0,
      balance numeric(15,2) DEFAULT 0,
      is_deleted boolean DEFAULT false,
      created_at timestamp with time zone DEFAULT NOW(),
      updated_at timestamp with time zone DEFAULT NOW()
    );

    -- Create sequence for financial_accounts starting at 2000 to avoid conflicts
    CREATE SEQUENCE finance.financial_accounts_id_seq START WITH 2000;
    ALTER TABLE finance.financial_accounts ALTER COLUMN id SET DEFAULT nextval('finance.financial_accounts_id_seq');

    -- 2. Create the unified financial_account_ledger table
    CREATE TABLE finance.financial_account_ledger (
      id bigserial PRIMARY KEY,
      financial_account_id integer NOT NULL REFERENCES finance.financial_accounts(id) ON DELETE CASCADE,
      entry_type varchar(50) NOT NULL,
      amount numeric(15,2) NOT NULL,
      signed_amount numeric(15,2) NOT NULL,
      balance_after numeric(15,2) NOT NULL,
      source_kind varchar(50),
      source_id varchar(50),
      exchange_rate numeric(15,2),
      vnd_equivalent numeric(15,2),
      note text,
      created_at timestamp with time zone DEFAULT NOW()
    );

    -- Create index for quick lookup
    CREATE INDEX idx_financial_account_ledger_acc ON finance.financial_account_ledger(financial_account_id);

    -- 3. Migrate bank accounts (type = 'bank', keeping IDs)
    INSERT INTO finance.financial_accounts (
      id, account_type, label, account_number, account_holder, bank_bin, bank_short_code, 
      bank_display_name, qr_note_prefix, is_default, is_active, total_withdrawn, total_received, 
      balance, is_deleted, created_at, updated_at
    )
    SELECT 
      id, 'bank', label, account_number, account_holder, bank_bin, bank_short_code, 
      bank_display_name, qr_note_prefix, is_default, is_active, COALESCE(total_withdrawn, 0), COALESCE(total_received, 0), 
      COALESCE(balance, 0), COALESCE(is_deleted, false), created_at, updated_at
    FROM finance.shop_bank_accounts;

    -- 4. Migrate USDT wallets (type = 'usdt', shifting IDs by 1000)
    INSERT INTO finance.financial_accounts (
      id, account_type, label, account_number, bank_short_code, is_default, is_active, 
      total_received, total_withdrawn, balance, created_at, updated_at
    )
    SELECT 
      id + 1000, 'usdt', label, wallet_address, network, is_default, is_active, 
      COALESCE(total_received, 0), COALESCE(total_withdrawn, 0), COALESCE(balance, 0), created_at, updated_at
    FROM finance.usdt_wallets;

    -- Update the sequence value to max id + 1 to prevent future conflicts
    SELECT setval('finance.financial_accounts_id_seq', COALESCE((SELECT MAX(id) FROM finance.financial_accounts), 2000) + 1);

    -- 5. Migrate bank account ledgers
    INSERT INTO finance.financial_account_ledger (
      financial_account_id, entry_type, amount, signed_amount, balance_after, source_kind, source_id, note, created_at
    )
    SELECT 
      shop_bank_account_id, entry_type, amount, signed_amount, balance_after, source_kind, source_id::text, note, created_at
    FROM finance.shop_bank_account_ledger;

    -- 6. Migrate USDT wallet ledgers (shifting wallet id reference by 1000)
    INSERT INTO finance.financial_account_ledger (
      financial_account_id, entry_type, amount, signed_amount, balance_after, source_kind, source_id, exchange_rate, vnd_equivalent, note, created_at
    )
    SELECT 
      usdt_wallet_id + 1000, entry_type, amount, signed_amount, balance_after, source_kind, source_id, exchange_rate, vnd_equivalent, note, created_at
    FROM finance.usdt_wallet_ledger;

    -- 7. Update references in other tables
    -- Shift usdt_wallet_id by 1000 in order_list
    UPDATE business.order_list SET usdt_wallet_id = usdt_wallet_id + 1000 WHERE usdt_wallet_id IS NOT NULL;

    -- Drop old FK constraints
    ALTER TABLE finance.shop_bank_account_ledger DROP CONSTRAINT IF EXISTS shop_bank_account_ledger_account_fkey;
    ALTER TABLE finance.usdt_wallet_ledger DROP CONSTRAINT IF EXISTS usdt_wallet_ledger_usdt_wallet_id_fkey;
    ALTER TABLE finance.store_profit_expenses DROP CONSTRAINT IF EXISTS store_profit_expenses_shop_bank_account_fkey;

    -- Re-create constraints pointing to the new unified table
    ALTER TABLE finance.store_profit_expenses 
      ADD CONSTRAINT store_profit_expenses_shop_bank_account_fkey 
      FOREIGN KEY (shop_bank_account_id) REFERENCES finance.financial_accounts(id);

    ALTER TABLE business.order_list
      DROP CONSTRAINT IF EXISTS order_list_usdt_wallet_id_fkey;

    ALTER TABLE business.order_list
      ADD CONSTRAINT order_list_usdt_wallet_id_fkey 
      FOREIGN KEY (usdt_wallet_id) REFERENCES finance.financial_accounts(id);

    -- 8. Drop old tables/ledgers
    DROP TABLE IF EXISTS finance.shop_bank_account_ledger CASCADE;
    DROP TABLE IF EXISTS finance.shop_bank_accounts CASCADE;
    DROP TABLE IF EXISTS finance.usdt_wallet_ledger CASCADE;
    DROP TABLE IF EXISTS finance.usdt_wallets CASCADE;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    -- Recreate old tables
    CREATE TABLE finance.shop_bank_accounts (
      id integer NOT NULL PRIMARY KEY,
      label text,
      account_number text NOT NULL,
      account_holder text,
      bank_bin text,
      bank_short_code text,
      bank_display_name text,
      qr_note_prefix text,
      is_default boolean DEFAULT false,
      is_active boolean DEFAULT true,
      total_withdrawn numeric(15,2) DEFAULT 0,
      total_received numeric(15,2) DEFAULT 0,
      balance numeric(15,2) DEFAULT 0,
      is_deleted boolean DEFAULT false,
      created_at timestamp with time zone DEFAULT NOW(),
      updated_at timestamp with time zone DEFAULT NOW()
    );

    CREATE TABLE finance.usdt_wallets (
      id integer NOT NULL PRIMARY KEY,
      label text,
      wallet_address text NOT NULL,
      network text,
      is_default boolean DEFAULT false,
      is_active boolean DEFAULT true,
      total_received numeric(15,2) DEFAULT 0,
      total_withdrawn numeric(15,2) DEFAULT 0,
      balance numeric(15,2) DEFAULT 0,
      created_at timestamp with time zone DEFAULT NOW(),
      updated_at timestamp with time zone DEFAULT NOW()
    );

    CREATE TABLE finance.shop_bank_account_ledger (
      id bigserial PRIMARY KEY,
      shop_bank_account_id integer NOT NULL REFERENCES finance.shop_bank_accounts(id),
      entry_type varchar(50) NOT NULL,
      amount numeric(15,2) NOT NULL,
      signed_amount numeric(15,2) NOT NULL,
      balance_after numeric(15,2) NOT NULL,
      source_kind varchar(50),
      source_id bigint,
      note text,
      created_at timestamp with time zone DEFAULT NOW()
    );

    CREATE TABLE finance.usdt_wallet_ledger (
      id bigserial PRIMARY KEY,
      usdt_wallet_id integer NOT NULL REFERENCES finance.usdt_wallets(id),
      entry_type varchar(50) NOT NULL,
      amount numeric(15,2) NOT NULL,
      signed_amount numeric(15,2) NOT NULL,
      balance_after numeric(15,2) NOT NULL,
      source_kind varchar(50),
      source_id varchar(50),
      exchange_rate numeric(15,2),
      vnd_equivalent numeric(15,2),
      note text,
      created_at timestamp with time zone DEFAULT NOW()
    );

    -- Move data back
    INSERT INTO finance.shop_bank_accounts SELECT id, label, account_number, account_holder, bank_bin, bank_short_code, bank_display_name, qr_note_prefix, is_default, is_active, total_withdrawn, total_received, balance, is_deleted, created_at, updated_at FROM finance.financial_accounts WHERE account_type = 'bank';
    INSERT INTO finance.usdt_wallets SELECT id - 1000, label, account_number, bank_short_code, is_default, is_active, total_received, total_withdrawn, balance, created_at, updated_at FROM finance.financial_accounts WHERE account_type = 'usdt';

    INSERT INTO finance.shop_bank_account_ledger (shop_bank_account_id, entry_type, amount, signed_amount, balance_after, source_kind, source_id, note, created_at)
    SELECT financial_account_id, entry_type, amount, signed_amount, balance_after, source_kind, source_id::bigint, note, created_at FROM finance.financial_account_ledger WHERE financial_account_id IN (SELECT id FROM finance.financial_accounts WHERE account_type = 'bank');

    INSERT INTO finance.usdt_wallet_ledger (usdt_wallet_id, entry_type, amount, signed_amount, balance_after, source_kind, source_id, exchange_rate, vnd_equivalent, note, created_at)
    SELECT financial_account_id - 1000, entry_type, amount, signed_amount, balance_after, source_kind, source_id, exchange_rate, vnd_equivalent, note, created_at FROM finance.financial_account_ledger WHERE financial_account_id IN (SELECT id FROM finance.financial_accounts WHERE account_type = 'usdt');

    -- Restore references in other tables
    UPDATE business.order_list SET usdt_wallet_id = usdt_wallet_id - 1000 WHERE usdt_wallet_id IS NOT NULL;

    -- Drop new tables
    DROP TABLE IF EXISTS finance.financial_account_ledger CASCADE;
    DROP TABLE IF EXISTS finance.financial_accounts CASCADE;
  `);
};
