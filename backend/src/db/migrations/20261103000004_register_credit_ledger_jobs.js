const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

const JOBS = [
  {
    id: "task_credit_overdraft_accrual",
    name: "Tích lãi thấu chi VPBank theo ngày",
    description: "Tính lãi thấu chi theo dư nợ tại cutoff của từng business date.",
    group_name: "finance",
    time: "17:05",
    frequency: "daily",
    enabled: true,
    handler_key: "credit_overdraft_accrual",
    selected_days: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
  },
  {
    id: "task_credit_overdraft_statement_close",
    name: "Chốt statement lãi thấu chi VPBank",
    description: "Chạy hằng ngày nhưng chỉ chốt account có statementCloseDay trùng business date.",
    group_name: "finance",
    time: "00:10",
    frequency: "daily",
    enabled: true,
    handler_key: "credit_overdraft_statement_close",
    selected_days: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
  },
  {
    id: "task_credit_card_due_evaluation",
    name: "Đánh giá hạn thanh toán thẻ VPBank",
    description: "Đánh giá PAID_IN_FULL, MINIMUM_PAID hoặc PAST_DUE theo due_at của từng statement.",
    group_name: "finance",
    time: "17:05",
    frequency: "daily",
    enabled: true,
    handler_key: "credit_card_due_evaluation",
    selected_days: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
  },];

exports.up = async (knex) => {
  await knex.withSchema(SYSTEM_SCHEMA).table("cron_jobs").insert(JOBS).onConflict("id").ignore();
};

exports.down = async (knex) => {
  await knex.withSchema(SYSTEM_SCHEMA).table("cron_jobs").whereIn("id", JOBS.map((job) => job.id)).del();
};