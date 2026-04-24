const TABLE = "system_automation.accounts_admin";

exports.up = async function up(knex) {
  await knex.schema.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'accounts_admin'
          AND column_name = 'id_product'
      ) THEN
        ALTER TABLE ${TABLE}
          ADD COLUMN "id_product" TEXT NULL;
      END IF;
    END $$;
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP COLUMN IF EXISTS id_product;
  `);
};
