const knex = require("knex");
const { DATABASE_URL } = require("@/config/env");

const searchPath = [
  "public",
  "billing",
  "orders",
  "identity",
  "partner",
  "product",
  "promotion",
  "supplier",
  "supplier_cost",
  "wallet",
  "form_desc",
  "inputs",
  "renew_adobe",
];

const db = knex({
  client: "pg",
  connection: DATABASE_URL,
  searchPath,
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
});

const withTransaction = async (handler) => {
  const trx = await db.transaction();
  try {
    const result = await handler(trx);
    await trx.commit();
    return result;
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

module.exports = {
  db,
  withTransaction,
};
