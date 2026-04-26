/**
 * Cộng dồn total_revenue mỗi lần INSERT biên lai (Sepay) vào payment_receipt.
 * (Không backfill dữ liệu tháng cũ — chỉ tăng từ bản ghi mới từ khi bật trigger.)
 */
const { loadBackendEnv } = require("../src/config/loadEnv");

loadBackendEnv();

const pickSchema = (...c) => c.find(Boolean);

const ident = (name) => {
  const s = String(name || "").trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return s;
};

exports.up = async function up(knex) {
  const fin = ident(
    pickSchema(process.env.DB_SCHEMA_FINANCE, process.env.SCHEMA_FINANCE, "dashboard")
  );
  const rec = ident(
    pickSchema(process.env.DB_SCHEMA_RECEIPT, process.env.SCHEMA_RECEIPT, "receipt")
  );
  const tSum = ident("dashboard_monthly_summary");
  const tPr = ident("payment_receipt");

  await knex.raw(`
    CREATE OR REPLACE FUNCTION "${rec}".fn_bump_dashboard_monthly_revenue()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    DECLARE
      mk text;
      amt numeric;
    BEGIN
      IF NEW.payment_date IS NULL THEN
        RETURN NEW;
      END IF;
      amt := COALESCE(NEW.amount::numeric, 0);
      IF amt = 0 THEN
        RETURN NEW;
      END IF;
      mk := TO_CHAR(DATE_TRUNC('month', NEW.payment_date::date), 'YYYY-MM');
      IF mk IS NULL OR length(mk) < 7 THEN
        RETURN NEW;
      END IF;
      INSERT INTO "${fin}".${tSum} (month_key, total_revenue, updated_at)
      VALUES (mk, amt, now())
      ON CONFLICT (month_key) DO UPDATE
      SET
        total_revenue = "${fin}".${tSum}.total_revenue + EXCLUDED.total_revenue,
        updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  `);

  await knex.raw(
    `DROP TRIGGER IF EXISTS tr_payment_receipt_dashboard_revenue ON "${rec}".${tPr};`
  );
  await knex.raw(
    `CREATE TRIGGER tr_payment_receipt_dashboard_revenue
     AFTER INSERT ON "${rec}".${tPr}
     FOR EACH ROW
     EXECUTE PROCEDURE "${rec}".fn_bump_dashboard_monthly_revenue();`
  );
};

exports.down = async function down(knex) {
  const rec = ident(
    pickSchema(process.env.DB_SCHEMA_RECEIPT, process.env.SCHEMA_RECEIPT, "receipt")
  );
  const tPr = ident("payment_receipt");
  await knex.raw(
    `DROP TRIGGER IF EXISTS tr_payment_receipt_dashboard_revenue ON "${rec}".${tPr};`
  );
  await knex.raw(
    `DROP FUNCTION IF EXISTS "${rec}".fn_bump_dashboard_monthly_revenue();`
  );
};
