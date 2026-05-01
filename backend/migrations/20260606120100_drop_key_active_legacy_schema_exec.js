/**
 * An toàn sau `20260606120000`: DROP SCHEMA nếu namespace còn sót (không throw khi đã sạch).
 */
exports.up = async function up(knex) {
  const exists = await knex.raw(
    `SELECT 1 AS x FROM pg_namespace WHERE nspname = 'key_active' LIMIT 1`
  );
  if (!exists.rows?.length) return;
  await knex.raw(`DROP SCHEMA IF EXISTS key_active CASCADE`);
};

exports.down = async function down() {};
