#!/usr/bin/env node
/** One-off: in app env, show DB name and whether admin.users exists. */
require("../../src/config/loadEnv").loadBackendEnv();
const knex = require("knex");
const { getPostgresConnectionUrl } = require("../../src/config/postgresConnectionUrl");

const url = getPostgresConnectionUrl();
const masked = url.replace(/:[^:@/]+@/, ":***@");
console.log("Resolved URL:", masked || "(empty)");

const db = knex({ client: "pg", connection: url });

db
  .raw(
    `select current_database() as db,
    exists (
      select 1 from information_schema.tables
      where table_schema = 'admin' and table_name = 'users'
    ) as admin_users_exists`
  )
  .then((r) => {
    console.log(JSON.stringify(r.rows[0], null, 2));
    return db.raw(
      `select table_schema, table_name from information_schema.tables
       where table_name ilike '%user%' and table_schema not in ('pg_catalog','information_schema')
       order by 1,2`
    );
  })
  .then((r) => {
    console.log("tables matching %user%:", r.rows);
    return db.destroy();
  })
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
    return db.destroy();
  });
