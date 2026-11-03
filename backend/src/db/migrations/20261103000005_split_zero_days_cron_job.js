const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

const NEW_CONFIGS = [
  {
    config_key: "ZERO_DAYS_NOTIFICATION_ENABLED",
    config_value: "true",
    data_type: "BOOLEAN",
    description: "Bật/tắt thông báo đơn hàng hết hạn hôm nay (0 ngày)",
    group_name: "ORDER_BUSINESS",
  },
  {
    config_key: "ZERO_DAYS_NOTIFICATION_TIME",
    config_value: "07:00",
    data_type: "STRING",
    description: "Thời gian trong ngày tự động gửi thông báo đơn hết hạn hôm nay (0 ngày)",
    group_name: "ORDER_BUSINESS",
  },
  {
    config_key: "ZERO_DAYS_TOPIC_ID",
    config_value: "2563",
    data_type: "STRING",
    description: "ID của Topic nhận thông báo đơn hết hạn hôm nay (0 ngày)",
    group_name: "NOTIFY",
  },
  {
    config_key: "FOUR_DAYS_TOPIC_ID",
    config_value: "12",
    data_type: "STRING",
    description: "ID của Topic nhận thông báo đơn cận hạn 4 ngày",
    group_name: "NOTIFY",
  },
];

const NEW_CRON_JOB = {
  id: "task_notify_zero_days_7h",
  name: "Thông báo đơn hàng hết hạn trong ngày (Đơn 0 ngày)",
  description: "Quét đơn hàng hết hạn hôm nay (0 ngày) và gửi thông báo nhắc gia hạn qua Telegram.",
  group_name: "notifications",
  time: "07:00",
  frequency: "daily",
  enabled: true,
  handler_key: "notify_zero_days",
  selected_days: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
};

exports.up = async (knex) => {
  const hasConfigs = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("system_configs");
  if (hasConfigs) {
    await knex
      .withSchema(SYSTEM_SCHEMA)
      .table("system_configs")
      .insert(NEW_CONFIGS)
      .onConflict("config_key")
      .ignore();
  }

  const hasCronJobs = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("cron_jobs");
  if (hasCronJobs) {
    // 1. Cập nhật task 0h chỉ còn nhiệm vụ cập nhật trạng thái đơn DB
    await knex
      .withSchema(SYSTEM_SCHEMA)
      .table("cron_jobs")
      .where("id", "task_order_status_0h")
      .update({
        name: "Cập nhật trạng thái đơn hàng (Hết hạn & Cần gia hạn)",
        description: "Rà soát hạn dùng đơn hàng và cập nhật trạng thái trong database lúc 00:00 (chạy ngầm, không gửi thông báo).",
        updated_at: knex.fn.now(),
      });

    // 2. Thêm task thông báo đơn 0 ngày riêng vào lúc 07:00
    await knex
      .withSchema(SYSTEM_SCHEMA)
      .table("cron_jobs")
      .insert(NEW_CRON_JOB)
      .onConflict("id")
      .ignore();
  }
};

exports.down = async (knex) => {
  const hasCronJobs = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("cron_jobs");
  if (hasCronJobs) {
    await knex
      .withSchema(SYSTEM_SCHEMA)
      .table("cron_jobs")
      .where("id", "task_notify_zero_days_7h")
      .del();

    await knex
      .withSchema(SYSTEM_SCHEMA)
      .table("cron_jobs")
      .where("id", "task_order_status_0h")
      .update({
        name: "Cập nhật trạng thái đơn & Thông báo đơn 0 ngày",
        description: "Rà soát hạn dùng đơn hàng, cập nhật trạng thái và gửi cảnh báo đơn 0 ngày.",
        updated_at: knex.fn.now(),
      });
  }

  const hasConfigs = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("system_configs");
  if (hasConfigs) {
    await knex
      .withSchema(SYSTEM_SCHEMA)
      .table("system_configs")
      .whereIn(
        "config_key",
        NEW_CONFIGS.map((c) => c.config_key)
      )
      .del();
  }
};

