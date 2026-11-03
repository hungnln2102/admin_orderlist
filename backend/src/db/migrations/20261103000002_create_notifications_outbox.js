const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

/**
 * Migration tạo bảng notifications_outbox cho Unified Notification Hub
 * và cập nhật lịch trình lệch pha cho các cron jobs trong runtime database.
 */
exports.up = async (knex) => {
  await knex.raw("CREATE SCHEMA IF NOT EXISTS ??", [SYSTEM_SCHEMA]);

  // 1. Tạo bảng notifications_outbox
  const hasTable = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("notifications_outbox");
  if (!hasTable) {
    await knex.schema.withSchema(SYSTEM_SCHEMA).createTable("notifications_outbox", (table) => {
      table.bigIncrements("id").primary();
      table.string("channel", 30).notNullable().defaultTo("TELEGRAM");
      table.string("event_type", 50).notNullable();
      table.string("idempotency_key", 150).notNullable().unique();
      table.string("topic_key", 50).nullable();
      table.string("recipient", 100).notNullable();
      table.smallint("priority").notNullable().defaultTo(3);
      table.jsonb("payload").nullable();
      table.string("rendered_title", 255).nullable();
      table.text("rendered_content").notNullable();
      table.boolean("has_media").defaultTo(false);
      table.text("media_buffer_base64").nullable();
      table.string("media_filename", 100).nullable();
      table.string("status", 20).notNullable().defaultTo("PENDING");
      table.integer("retry_count").defaultTo(0);
      table.integer("max_retries").defaultTo(5);
      table.timestamp("next_retry_at", { useTz: true }).defaultTo(knex.fn.now());
      table.timestamp("sent_at", { useTz: true }).nullable();
      table.text("last_error").nullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.index(["status", "next_retry_at", "priority"], "idx_notif_outbox_process");
      table.index(["event_type", "created_at"], "idx_notif_outbox_event");
      table.index(["status", "created_at"], "idx_notif_outbox_retention");
      table.check("status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')");
    });
  }

  // 2. Cập nhật lịch trình lệch pha trong system_automation.cron_jobs (Runtime SSOT)
  // Chỉ cập nhật nếu cấu hình vẫn mang giá trị mặc định ban đầu để tránh ghi đè cấu hình tùy biến của operator
  const hasCronJobs = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("cron_jobs");
  if (hasCronJobs) {
    // Tác vụ sinh lời tiết kiệm: chuyển từ :00 sang :15 mỗi giờ
    await knex.withSchema(SYSTEM_SCHEMA).table("cron_jobs")
      .where("id", "task_credit_savings_profit")
      .where("time", "00:00")
      .update({
        time: "00:15",
        frequency: "hourly",
        updated_at: knex.fn.now(),
      });

    // Tác vụ sao lưu Database: chuyển từ 03:30 sang 02:30 sáng
    await knex.withSchema(SYSTEM_SCHEMA).table("cron_jobs")
      .where("id", "task_auto_backup_database")
      .where("time", "03:30")
      .update({
        time: "02:30",
        updated_at: knex.fn.now(),
      });
  }
};

exports.down = async (knex) => {
  // Revert cron_jobs schedules về đúng giá trị seed ban đầu (00:00 và 03:30)
  const hasCronJobs = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("cron_jobs");
  if (hasCronJobs) {
    await knex.withSchema(SYSTEM_SCHEMA).table("cron_jobs")
      .where("id", "task_credit_savings_profit")
      .where("time", "00:15")
      .update({ time: "00:00", updated_at: knex.fn.now() });

    await knex.withSchema(SYSTEM_SCHEMA).table("cron_jobs")
      .where("id", "task_auto_backup_database")
      .where("time", "02:30")
      .update({ time: "03:30", updated_at: knex.fn.now() });
  }

  await knex.schema.withSchema(SYSTEM_SCHEMA).dropTableIfExists("notifications_outbox");
};

