const { SCHEMAS } = require("../tables");

exports.up = async function up(knex) {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${SCHEMAS.ADMIN};`);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${SCHEMAS.ADMIN}.user_sessions (
      sid VARCHAR NOT NULL PRIMARY KEY,
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    );
  `);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON ${SCHEMAS.ADMIN}.user_sessions (expire);`);
};

exports.down = async function down(knex) {
  await knex.raw(`DROP TABLE IF EXISTS ${SCHEMAS.ADMIN}.user_sessions;`);
};
