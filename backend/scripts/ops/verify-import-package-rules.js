const path = require("path");
const { Client } = require("pg");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env.local") });

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("Missing DATABASE_URL from backend/.env.local");
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        const tableResult = await client.query(
            "select to_regclass('product.import_package_rules') as table_name"
        );

        const columnsResult = await client.query(`
            select column_name
            from information_schema.columns
            where table_schema = 'product'
              and table_name = 'import_package_rules'
            order by ordinal_position
        `);

        const probeResult = await client.query(
            "select * from product.import_package_rules where product_id = $1 limit $2",
            [1, 1]
        );

        console.log("table_name=", tableResult.rows[0].table_name);
        console.log(
            "columns=",
            columnsResult.rows.map((row) => row.column_name).join(",")
        );
        console.log("rule_probe_rows=", probeResult.rowCount);
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});