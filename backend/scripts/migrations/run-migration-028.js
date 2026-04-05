/**
 * Tạo product.desc_variant, copy short_desc + rules + description (mô tả/thông tin)
 * từ variant → desc_variant, gắn variant.id_desc, xóa 3 cột đó trên variant.
 * Cột image_url GIỮ LẠI trên variant (ảnh COALESCE desc → variant → product trong API).
 * Hỗ trợ DB cũ đã có desc_variant_id → gộp sang id_desc.
 * Chạy: npm run migrate:028 (idempotent)
 */
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const { Client } = require("pg");

const migrationPath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "database",
  "migrations",
  "028_desc_variant.sql"
);

async function columnExists(client, tableName, columnName) {
  const r = await client.query(
    `
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'product'
      AND table_name = $1
      AND column_name = $2
    `,
    [tableName, columnName]
  );
  return r.rows.length > 0;
}

async function ensureIdDescColumn(client) {
  const hasOld = await columnExists(client, "variant", "desc_variant_id");
  const hasNew = await columnExists(client, "variant", "id_desc");

  if (hasOld && hasNew) {
    await client.query(`
      UPDATE product.variant
      SET id_desc = desc_variant_id
      WHERE id_desc IS NULL AND desc_variant_id IS NOT NULL
    `);
    await client.query(`
      ALTER TABLE product.variant
      DROP CONSTRAINT IF EXISTS variant_desc_variant_id_fkey
    `);
    await client.query(`DROP INDEX IF EXISTS product.idx_variant_desc_variant_id`);
    await client.query(`
      ALTER TABLE product.variant DROP COLUMN IF EXISTS desc_variant_id
    `);
  } else if (hasOld && !hasNew) {
    await client.query(`
      ALTER TABLE product.variant DROP CONSTRAINT IF EXISTS variant_desc_variant_id_fkey
    `);
    await client.query(`DROP INDEX IF EXISTS product.idx_variant_desc_variant_id`);
    await client.query(`
      ALTER TABLE product.variant
      RENAME COLUMN desc_variant_id TO id_desc
    `);
  }

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'variant_id_desc_fkey'
      ) THEN
        ALTER TABLE product.variant
          ADD CONSTRAINT variant_id_desc_fkey
          FOREIGN KEY (id_desc)
          REFERENCES product.desc_variant (id)
          ON DELETE RESTRICT;
      END IF;
    END $$;
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_variant_id_desc
    ON product.variant (id_desc)
  `);
}

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    await ensureIdDescColumn(client);

    const hasRules = await columnExists(client, "variant", "rules");
    const hasDescription = await columnExists(client, "variant", "description");
    const hasInformation = await columnExists(client, "variant", "information");
    const hasShortDesc = await columnExists(client, "variant", "short_desc");
    const hasAnyLegacyText =
      hasRules || hasDescription || hasInformation || hasShortDesc;

    const { rows: needRows } = await client.query(`
      SELECT id FROM product.variant WHERE id_desc IS NULL ORDER BY id
    `);

    for (const { id } of needRows) {
      if (hasAnyLegacyText) {
        const fields = ["id"];
        if (hasRules) {
          fields.push("rules");
        }
        if (hasDescription) {
          fields.push("description");
        } else if (hasInformation) {
          fields.push("information AS description");
        }
        if (hasShortDesc) {
          fields.push("short_desc");
        }

        const r = await client.query(
          `
          SELECT ${fields.join(", ")} FROM product.variant WHERE id = $1
        `,
          [id]
        );
        const v = r.rows[0];
        const rulesVal = hasRules ? v.rules : null;
        const descVal =
          hasDescription || hasInformation ? v.description : null;
        const shortVal = hasShortDesc ? v.short_desc : null;

        const ins = await client.query(
          `
          INSERT INTO product.desc_variant (rules, description, short_desc, updated_at)
          VALUES ($1, $2, $3, now())
          RETURNING id
        `,
          [rulesVal, descVal, shortVal]
        );
        await client.query(
          `UPDATE product.variant SET id_desc = $1 WHERE id = $2`,
          [ins.rows[0].id, id]
        );
      } else {
        const ins = await client.query(`
          INSERT INTO product.desc_variant (updated_at) VALUES (now()) RETURNING id
        `);
        await client.query(
          `UPDATE product.variant SET id_desc = $1 WHERE id = $2`,
          [ins.rows[0].id, id]
        );
      }
    }

    const stillNull = await client.query(`
      SELECT COUNT(*)::int AS c FROM product.variant WHERE id_desc IS NULL
    `);
    if (stillNull.rows[0].c > 0) {
      throw new Error(
        `Còn ${stillNull.rows[0].c} variant chưa có id_desc.`
      );
    }

    await client.query(`
      ALTER TABLE product.variant
      ALTER COLUMN id_desc SET NOT NULL
    `);

    await client.query(`
      ALTER TABLE product.variant DROP COLUMN IF EXISTS rules;
      ALTER TABLE product.variant DROP COLUMN IF EXISTS description;
      ALTER TABLE product.variant DROP COLUMN IF EXISTS information;
      ALTER TABLE product.variant DROP COLUMN IF EXISTS short_desc;
    `);

    console.log(
      "Migration 028 xong: desc_variant; variant.id_desc; đã copy rules/description/short_desc (và information→description nếu có); đã xóa cột nội dung legacy trên variant; giữ image_url trên variant."
    );
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Lỗi chạy migration 028:", err);
  process.exit(1);
});
