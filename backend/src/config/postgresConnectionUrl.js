/**
 * Chuỗi kết nối Postgres dùng chung cho Knex, pg.Pool và knexfile.
 *
 * Thứ tự: DATABASE_URL → POSTGRES_URL → PG_URL.
 * Nếu cả ba đều trống, ghép từ DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME (tiện cho `.env.local`).
 */
function getPostgresConnectionUrl() {
  const direct = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PG_URL ||
    ""
  ).trim();
  if (direct) return direct;

  const user = (process.env.DB_USER || "").trim();
  const pass = process.env.DB_PASS ?? "";
  const host = (process.env.DB_HOST || "127.0.0.1").trim();
  const port = (process.env.DB_PORT || "5432").trim();
  const name = (process.env.DB_NAME || "").trim();

  if (!user || !name) return "";

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(pass);
  return `postgresql://${u}:${p}@${host}:${port}/${encodeURIComponent(name)}`;
}

module.exports = { getPostgresConnectionUrl };
