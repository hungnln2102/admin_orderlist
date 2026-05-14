/**
 * Gỡ schema `key_active` còn sót sau khi baseline đã có `system_automation.order_list_keys`.
 *
 * Luồng lỗi cũ: `078` không ALTER SCHEMA được khi bảng trùng tên đã có trong `system_automation`;
 * migration `20260412200000` lại tạo trigger trên `orders.order_list` trỏ `key_active.*`.
 *
 * Cách xử lý: luôn repoint trigger theo `082`, rồi DROP SCHEMA `key_active` (dữ liệu trong bản
 * trùng lặp từ `key_active` bị bỏ — với DB mới hai bản thường rỗng; production đã merge 078 từ trước).
 *
 * @see database/migrations/082_fix_order_list_keys_trigger_to_system_automation.sql
 */
const fs = require("fs");
const path = require("path");

exports.up = async function up(knex) {
  const exists = await knex.raw(
    `SELECT 1 AS x FROM pg_namespace WHERE nspname = 'key_active' LIMIT 1`
  );
  if (!exists.rows?.length) return;

  const hasSaKeys = await knex.raw(
    `SELECT 1 AS x
     FROM information_schema.tables
     WHERE table_schema = 'system_automation' AND table_name = 'order_list_keys'
     LIMIT 1`
  );

  if (hasSaKeys.rows?.length) {
    const p082 = path.join(
      __dirname,
      "..",
      "..",
      "database",
      "migrations",
      "082_fix_order_list_keys_trigger_to_system_automation.sql"
    );
    await knex.raw(fs.readFileSync(p082, "utf8"));
    await knex.raw(`DROP SCHEMA IF EXISTS key_active CASCADE`);
    return;
  }

  const sql078 = path.join(
    __dirname,
    "..",
    "..",
    "database",
    "migrations",
    "078_merge_key_active_into_system_automation.sql"
  );
  await knex.raw(fs.readFileSync(sql078, "utf8"));

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
          'key_active still has % table(s): migrate manually (078 + repoint triggers)',
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
          'orders.order_list still has % trigger(s) calling key_active functions',
          trig_count;
      END IF;

      DROP SCHEMA IF EXISTS key_active CASCADE;
    END
    $drop_legacy$;
  `);
};

exports.down = async function down() {};
