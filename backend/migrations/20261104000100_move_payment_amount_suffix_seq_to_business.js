exports.up = async function (knex) {
  // Di chuyển sequence orders.payment_amount_suffix_seq sang schema business
  await knex.raw(`
    DO $$
    BEGIN
      -- Nếu sequence đã tồn tại ở cả hai schema, ta drop bản ở business trước (để giữ bản ở orders vốn có last_value mới hơn: 93 so với 9)
      IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'orders' AND c.relname = 'payment_amount_suffix_seq' AND c.relkind = 'S'
      ) AND EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'business' AND c.relname = 'payment_amount_suffix_seq' AND c.relkind = 'S'
      ) THEN
        DROP SEQUENCE business.payment_amount_suffix_seq;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'orders' AND c.relname = 'payment_amount_suffix_seq' AND c.relkind = 'S'
      ) THEN
        ALTER SEQUENCE orders.payment_amount_suffix_seq SET SCHEMA business;
      END IF;
    END
    $$;
  `);

  // Xóa schema orders cũ nếu nó trống
  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_namespace WHERE nspname = 'orders'
      ) THEN
        -- Kiểm tra xem còn object nào trong schema orders không
        IF NOT EXISTS (
          SELECT 1
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'orders'
        ) THEN
          DROP SCHEMA orders CASCADE;
        END IF;
      END IF;
    END
    $$;
  `);
};

exports.down = async function (knex) {
  // Đảo ngược: chuyển sequence business.payment_amount_suffix_seq về orders
  await knex.raw(`
    CREATE SCHEMA IF NOT EXISTS orders;
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'business' AND c.relname = 'payment_amount_suffix_seq' AND c.relkind = 'S'
      ) THEN
        ALTER SEQUENCE business.payment_amount_suffix_seq SET SCHEMA orders;
      END IF;
    END
    $$;
  `);
};
