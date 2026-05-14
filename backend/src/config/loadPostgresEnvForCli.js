/**
 * Nạp env đủ cho Postgres (Knex, script ops) sau `loadBackendEnv()`.
 * Trên VPS thường không set NODE_ENV=production trong shell ⇒ `.env.docker` không được load;
 * module này thử thêm các file .env quen thuộc với `override: true`.
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { loadBackendEnv, backendRoot } = require("./loadEnv");
const { getPostgresConnectionUrl } = require("./postgresConnectionUrl");

function buildFallbackEntries() {
  const repoRoot = path.resolve(backendRoot, "..");
  return [
    ["scripts/.env", path.join(backendRoot, "scripts", ".env")],
    ["backend/.env", path.join(backendRoot, ".env")],
    ["backend/.env.docker", path.join(backendRoot, ".env.docker")],
    ["backend/.env.local", path.join(backendRoot, ".env.local")],
    ["repo-root/.env (admin_orderlist/)", path.join(repoRoot, ".env")],
  ];
}

/** @returns {string} URL kết nối hoặc "" */
function loadPostgresEnvForCli() {
  loadBackendEnv();
  let url = String(getPostgresConnectionUrl() || "").trim();
  if (url) return url;

  for (const [, filePath] of buildFallbackEntries()) {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) continue;
    const r = dotenv.config({ path: resolved, override: true });
    if (r.error) continue;
    url = String(getPostgresConnectionUrl() || "").trim();
    if (url) return url;
  }
  return "";
}

function getPostgresCliFallbackPathsForHelp() {
  return buildFallbackEntries().map(([label, p]) => [label, path.resolve(p)]);
}

module.exports = {
  loadPostgresEnvForCli,
  getPostgresCliFallbackPathsForHelp,
};
