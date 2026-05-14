/**
 * Tương thích: migration 20260425120100 đã DROP `users_snapshot`.
 * Một số bản build scheduler/API cũ (Docker image chưa deploy) vẫn SELECT/WHERE
 * trên cột này → lỗi "column does not exist" lúc cron 23:30.
 * Thêm lại cột NULL, không dùng bởi code mới (mapping + order_user_tracking thay thế).
 */
const TABLE = "system_automation.accounts_admin";

exports.up = async function up(knex) {
  await knex.schema.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'accounts_admin'
          AND column_name = 'users_snapshot'
      ) THEN
        ALTER TABLE ${TABLE}
        ADD COLUMN users_snapshot TEXT NULL;
      END IF;
    END $$;
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    ALTER TABLE ${TABLE} DROP COLUMN IF EXISTS users_snapshot;
  `);
};
