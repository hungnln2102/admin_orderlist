const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

const DEFAULT_CRON_JOBS = [
  ["task_order_status_0h", "Cập nhật trạng thái đơn & Thông báo đơn 0 ngày", "Rà soát hạn dùng đơn hàng, cập nhật trạng thái và gửi cảnh báo đơn 0 ngày.", "orders", "00:00", "daily", true, "order_status_0h"],
  ["task_notify_four_days_7h", "Thông báo nhắc gia hạn đơn hàng (Đơn 4 ngày)", "Quét đơn hàng sắp hết hạn và gửi thông báo nhắc gia hạn.", "notifications", "07:00", "daily", true, "notify_four_days"],
  ["task_credit_savings_profit", "Tự động sinh lời & cộng lãi đa sổ tiết kiệm", "Quét các sổ tiết kiệm đủ điều kiện và ghi nhận lãi tự động.", "finance", "00:00", "hourly", true, "credit_savings_profit"],
  ["task_finalize_daily_summary", "Chốt số liệu thống kê doanh thu cuối ngày", "Tạo dữ liệu thống kê cho ngày mới và chốt số liệu cuối ngày.", "summary", "23:55", "daily", true, "finalize_daily_summary"],
  ["task_auto_backup_database", "Tự động sao lưu Database lên Google Drive", "Tự động kết xuất sao lưu cơ sở dữ liệu định kỳ và tải lên Google Drive (hoặc lưu trữ cục bộ an toàn).", "backup", "03:30", "daily", false, "auto_backup_database"],
].map(([id, name, description, group_name, time, frequency, enabled, handler_key]) => ({
  id, name, description, group_name, time, frequency, enabled, handler_key,
  selected_days: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
}));

exports.up = async (knex) => {
  await knex.raw("CREATE SCHEMA IF NOT EXISTS ??", [SYSTEM_SCHEMA]);
  await knex.schema.withSchema(SYSTEM_SCHEMA).createTable("cron_jobs", (table) => {
    table.string("id", 100).primary();
    table.string("name", 255).notNullable();
    table.text("description").notNullable().defaultTo("");
    table.string("group_name", 40).notNullable();
    table.string("time", 5).notNullable();
    table.string("frequency", 20).notNullable();
    table.jsonb("selected_days").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.boolean("enabled").notNullable().defaultTo(true);
    table.string("handler_key", 100).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.check("frequency IN ('daily', 'weekdays', 'hourly', 'custom')");
  });
  await knex.schema.withSchema(SYSTEM_SCHEMA).createTable("cron_job_logs", (table) => {
    table.bigIncrements("id").primary();
    table.string("job_id", 100).notNullable().references("id").inTable(`${SYSTEM_SCHEMA}.cron_jobs`).onDelete("CASCADE");
    table.timestamp("started_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.integer("duration_ms").notNullable();
    table.string("status", 20).notNullable();
    table.text("output").notNullable();
    table.string("triggered_by", 30).notNullable();
    table.index(["job_id", "started_at"]);
    table.check("status IN ('success', 'failed')");
    table.check("triggered_by IN ('cron_schedule', 'manual_ui')");
  });
  await knex.withSchema(SYSTEM_SCHEMA).table("cron_jobs").insert(DEFAULT_CRON_JOBS).onConflict("id").ignore();
};

exports.down = async (knex) => {
  await knex.schema.withSchema(SYSTEM_SCHEMA).dropTableIfExists("cron_job_logs");
  await knex.schema.withSchema(SYSTEM_SCHEMA).dropTableIfExists("cron_jobs");
};
