const knex = require("knex");
const pg = require("pg");
const { DATABASE_URL } = require("@/config/env");

// Chuẩn hóa kiểu DATE (PostgreSQL OID 1082) -> Giữ nguyên chuỗi "YYYY-MM-DD", triệt tiêu lỗi lệch ngày của JS Date
pg.types.setTypeParser(1082, (val) => val);

const searchPath = [
  "public",
  "admin",
  "business",
  "receipt",
  "orders",
  "identity",
  "partner",
  "product",
  "promotion",
  "finance",
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
    afterCreate: (conn, done) => {
      // Cố định múi giờ UTC+7 (Asia/Ho_Chi_Minh) trên mọi connection của PostgreSQL
      conn.query("SET timezone = 'Asia/Ho_Chi_Minh';", (err) => {
        done(err, conn);
      });
    },
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

const { TABLES, SCHEMAS, COLS } = require("./tables");

module.exports = {
  db,
  withTransaction,
  TABLES,
  SCHEMAS,
  COLS,
};

