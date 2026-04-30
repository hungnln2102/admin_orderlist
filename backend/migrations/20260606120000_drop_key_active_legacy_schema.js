/**
 * Sau merge `078_merge_key_active_into_system_automation`, bảng/key nằm ở `system_automation`.
 * Schema `key_active` còn sót (chỉ function/trống) gây nhầm — xóa nếu không còn bảng và không còn
 * trigger trên `orders.order_list` trỏ tới function trong `key_active`.
 *
 * @see database/legacy_sql_migrations/078_merge_key_active_into_system_automation.sql
 * @see backend/scripts/ops/verify-key-active-legacy-deps.js
 */
exports.up = async function up(knex) {
  await knex.raw(`
    DO $drop_legacy$
    DECLARE
      tbl_count int;
      trig_count int;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'key_active') THEN
        RETURN;
      END IF;

      SELECT COUNT(*)::int INTO tbl_count
      FROM information_schema.tables
      WHERE table_schema = 'key_active'
        AND table_type = 'BASE TABLE';

      IF tbl_count > 0 THEN
        RAISE EXCEPTION
          'key_active still has % table(s): run data migration (078) or drop tables manually before this migration',
          tbl_count;
      END IF;

      SELECT COUNT(*)::int INTO trig_count
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace tbl_ns ON tbl_ns.oid = c.relnamespace
      JOIN pg_proc p ON p.oid = t.tgfoid
      JOIN pg_namespace fn_ns ON fn_ns.oid = p.pronamespace
      WHERE tbl_ns.nspname = 'orders'
        AND c.relname = 'order_list'
        AND NOT t.tgisinternal
        AND fn_ns.nspname = 'key_active';

      IF trig_count > 0 THEN
        RAISE EXCEPTION
          'orders.order_list still has % trigger(s) calling key_active functions; repoint to system_automation first',
          trig_count;
      END IF;

      DROP SCHEMA IF EXISTS key_active CASCADE;
    END
    $drop_legacy$;
  `);
};

/** Không tái tạo schema legacy trong down. */
exports.down = async function down() {};
