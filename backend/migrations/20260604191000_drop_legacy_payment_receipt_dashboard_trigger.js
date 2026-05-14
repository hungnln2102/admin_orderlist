/**
 * Drop legacy receipt insert dashboard trigger.
 * Finance posting is handled by webhook/manual-webhook application logic.
 * @see database/legacy_sql_migrations/090_drop_legacy_payment_receipt_dashboard_trigger.sql
 */

const fs = require("fs");
const path = require("path");

exports.up = async function up(knex) {
  const sqlPath = path.join(
    __dirname,
    "..",
    "..",
    "database",
    "legacy_sql_migrations",
    "090_drop_legacy_payment_receipt_dashboard_trigger.sql"
  );
  await knex.raw(fs.readFileSync(sqlPath, "utf8"));
};

exports.down = async function down(knex) {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION receipt.fn_bump_dashboard_monthly_revenue()
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
      INSERT INTO dashboard.dashboard_monthly_summary (month_key, total_revenue, updated_at)
      VALUES (mk, amt, now())
      ON CONFLICT (month_key) DO UPDATE
      SET
        total_revenue = dashboard.dashboard_monthly_summary.total_revenue + EXCLUDED.total_revenue,
        updated_at = now();
      RETURN NEW;
    END;
    $fn$;

    DROP TRIGGER IF EXISTS tr_payment_receipt_dashboard_revenue ON receipt.payment_receipt;
    CREATE TRIGGER tr_payment_receipt_dashboard_revenue
      AFTER INSERT ON receipt.payment_receipt
      FOR EACH ROW
      EXECUTE PROCEDURE receipt.fn_bump_dashboard_monthly_revenue();
  `);
};
