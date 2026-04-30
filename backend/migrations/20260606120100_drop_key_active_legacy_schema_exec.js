/**
 * Bổ sung cho `20260606120000`: DROP SCHEMA `key_active` ngoài khối DO (tránh edge case transaction).
 * Idempotent nếu schema đã không còn.
 *
 * @see backend/scripts/ops/verify-key-active-legacy-deps.js
 */
exports.up = async function up(knex) {
  const exists = await knex.raw(
    `SELECT 1 AS x FROM pg_namespace WHERE nspname = 'key_active' LIMIT 1`
  );
  if (!exists.rows?.length) return;

  const tbl = await knex.raw(
    `SELECT COUNT(*)::int AS c
     FROM information_schema.tables
     WHERE table_schema = 'key_active' AND table_type = 'BASE TABLE'`
  );
  if (Number(tbl.rows?.[0]?.c) > 0) {
    throw new Error(
      "key_active still has tables; migrate with 078 before dropping schema"
    );
  }

  const trg = await knex.raw(
    `SELECT COUNT(*)::int AS t
     FROM pg_trigger tr
     JOIN pg_class c ON c.oid = tr.tgrelid
     JOIN pg_namespace tbl_ns ON tbl_ns.oid = c.relnamespace
     JOIN pg_proc p ON p.oid = tr.tgfoid
     JOIN pg_namespace fn_ns ON fn_ns.oid = p.pronamespace
     WHERE tbl_ns.nspname = 'orders'
       AND c.relname = 'order_list'
       AND NOT tr.tgisinternal
       AND fn_ns.nspname = 'key_active'`
  );
  if (Number(trg.rows?.[0]?.t) > 0) {
    throw new Error("orders.order_list still references key_active functions");
  }

  await knex.raw(`DROP SCHEMA IF EXISTS key_active CASCADE`);
};

exports.down = async function down() {};
