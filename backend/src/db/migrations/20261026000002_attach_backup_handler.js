const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

exports.up = async function (knex) {
  await knex.withSchema(SYSTEM_SCHEMA).table("cron_jobs")
    .where("id", "task_auto_backup_database")
    .update({
      handler_key: "auto_backup_database",
      description: "Tự động kết xuất sao lưu cơ sở dữ liệu định kỳ và tải lên Google Drive (hoặc lưu trữ cục bộ an toàn).",
      updated_at: knex.fn.now(),
    });
};

exports.down = async function (knex) {
  await knex.withSchema(SYSTEM_SCHEMA).table("cron_jobs")
    .where("id", "task_auto_backup_database")
    .update({
      handler_key: null,
      description: "Tác vụ sao lưu dự phòng, cần gắn handler vận hành trước khi bật.",
      updated_at: knex.fn.now(),
    });
};
