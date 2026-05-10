/**
 * Cột `system_note` cho `system_automation.order_user_tracking` — đánh dấu đơn thuộc
 * hệ thống fix nào (renew_adobe, fix_adobe_edu, ...) thay cho bảng `product_system` cũ
 * (ánh xạ ở mức variant).
 *
 * Tiếp cận:
 * - VARCHAR(64), default 'renew_adobe' để các dòng cũ tự backfill khi ALTER.
 * - Index để lọc theo system khi list/cron sau này.
 */

const TABLE = "system_automation.order_user_tracking";

exports.up = async function up(knex) {
  await knex.schema.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'system_automation'
          AND table_name = 'order_user_tracking'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'order_user_tracking'
          AND column_name = 'system_note'
      ) THEN
        ALTER TABLE ${TABLE}
          ADD COLUMN "system_note" VARCHAR(64) NOT NULL DEFAULT 'renew_adobe';
      END IF;
    END $$;
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_order_user_tracking_system_note
      ON ${TABLE} (system_note);
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    DROP INDEX IF EXISTS system_automation.idx_order_user_tracking_system_note;
  `);
  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP COLUMN IF EXISTS system_note;
  `);
};
