const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env.local") });

async function main() {
    const sqlPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "database",
        "migrations",
        "113_import_package_rules.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    if (!process.env.DATABASE_URL) {
        throw new Error("Missing DATABASE_URL from backend/.env.local");
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        await client.query(sql);
        const result = await client.query(
            "select to_regclass('product.import_package_rules') as table_name"
        );
        console.log("migration_113_applied=", result.rows[0].table_name);
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});