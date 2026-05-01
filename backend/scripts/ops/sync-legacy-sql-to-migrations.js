const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..", "..", "database");
const leg = path.join(root, "legacy_sql_migrations");
const mig = path.join(root, "migrations");

for (const f of fs.readdirSync(leg)) {
  if (!f.endsWith(".sql") || f === "000_full_schema.sql") continue;
  fs.copyFileSync(path.join(leg, f), path.join(mig, f));
}
console.log("Copied SQL shards from legacy_sql_migrations -> migrations (excl. 000_full_schema.sql)");
