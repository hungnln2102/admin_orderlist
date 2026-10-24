const { db, TABLES, COLS } = require("@/db");

const J = COLS.CRON_JOBS;
const L = COLS.CRON_JOB_LOGS;
const GROUP_LABELS = { orders: "Đơn Hàng & Vận Hành", notifications: "Thông Báo Khách Hàng", finance: "Tài Chính & Tín Dụng", summary: "Báo Cáo & Kế Toán", backup: "Sao Lưu Hệ Thống" };
const FREQUENCY_LABELS = { daily: "Hàng ngày", weekdays: "Thứ 2 - Thứ 6", hourly: "Định kỳ mỗi giờ", custom: "Tùy chỉnh" };
const VALID_GROUPS = new Set(Object.keys(GROUP_LABELS));
const VALID_FREQUENCIES = new Set(Object.keys(FREQUENCY_LABELS));

const parseDays = (value) => {
  if (Array.isArray(value)) return value.map(Number);
  try { return JSON.parse(value || "[]").map(Number); } catch { return []; }
};

const normalizeTime = (value) => {
  const time = String(value || "");
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error("Giờ chạy phải có định dạng HH:mm.");
  return time;
};

const normalizeDays = (value, frequency) => {
  if (frequency === "weekdays") return [1, 2, 3, 4, 5];
  const days = Array.isArray(value) ? value.map(Number).filter((day) => day >= 1 && day <= 7) : [1, 2, 3, 4, 5, 6, 7];
  return [...new Set(days)].sort((a, b) => a - b);
};

const buildCronExpression = ({ time, frequency, selectedDays }) => {
  const [hour, minute] = time.split(":");
  if (frequency === "hourly") return `${minute} * * * *`;
  if (frequency === "weekdays") return `${minute} ${hour} * * 1-5`;
  if (frequency === "custom" && selectedDays.length) return `${minute} ${hour} * * ${selectedDays.map((day) => day % 7).join(",")}`;
  return `${minute} ${hour} * * *`;
};

const toDto = (row, latestLog, nextRunTime) => {
  const selectedDays = parseDays(row[J.SELECTED_DAYS]);
  return {
    id: row[J.ID], name: row[J.NAME], description: row[J.DESCRIPTION], group: row[J.GROUP_NAME],
    groupLabel: GROUP_LABELS[row[J.GROUP_NAME]] || row[J.GROUP_NAME], time: row[J.TIME], frequency: row[J.FREQUENCY],
    frequencyLabel: FREQUENCY_LABELS[row[J.FREQUENCY]] || row[J.FREQUENCY], selectedDays, enabled: row[J.ENABLED],
    lastRunTime: latestLog?.[L.STARTED_AT] || null, lastRunStatus: latestLog?.[L.STATUS] || null,
    lastRunMessage: latestLog?.[L.OUTPUT] || null, nextRunTime: nextRunTime || null,
    cronExpressionPreview: buildCronExpression({ time: row[J.TIME], frequency: row[J.FREQUENCY], selectedDays }),
  };
};

async function getJob(id) {
  const job = await db(TABLES.CRON_JOBS).where(J.ID, id).first();
  if (!job) throw new Error("Không tìm thấy tác vụ lịch trình.");
  return job;
}

async function listJobs(getNextRunTime) {
  const [jobs, logs] = await Promise.all([
    db(TABLES.CRON_JOBS).orderBy(J.CREATED_AT, "asc"),
    db(TABLES.CRON_JOB_LOGS).orderBy(L.STARTED_AT, "desc"),
  ]);
  const latestByJob = new Map();
  logs.forEach((log) => { if (!latestByJob.has(log[L.JOB_ID])) latestByJob.set(log[L.JOB_ID], log); });
  return jobs.map((job) => toDto(job, latestByJob.get(job[J.ID]), getNextRunTime?.(job[J.ID])));
}

async function createJob(payload) {
  const name = String(payload.name || "").trim();
  const group = String(payload.group || "");
  const frequency = String(payload.frequency || "");
  if (!name) throw new Error("Tên tác vụ là bắt buộc.");
  if (!VALID_GROUPS.has(group)) throw new Error("Nhóm nghiệp vụ không hợp lệ.");
  if (!VALID_FREQUENCIES.has(frequency)) throw new Error("Tần suất không hợp lệ.");
  const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db(TABLES.CRON_JOBS).insert({
    [J.ID]: id, [J.NAME]: name, [J.DESCRIPTION]: String(payload.description || "Tác vụ tự động hóa mới.").trim(),
    [J.GROUP_NAME]: group, [J.TIME]: normalizeTime(payload.time), [J.FREQUENCY]: frequency,
    [J.SELECTED_DAYS]: JSON.stringify(normalizeDays(payload.selectedDays, frequency)),
    [J.ENABLED]: false, [J.HANDLER_KEY]: null,
  });
  return getJob(id);
}

async function updateJob(id, payload) {
  const current = await getJob(id);
  const frequency = payload.frequency === undefined ? current[J.FREQUENCY] : String(payload.frequency);
  const group = payload.group === undefined ? current[J.GROUP_NAME] : String(payload.group);
  if (!VALID_FREQUENCIES.has(frequency)) throw new Error("Tần suất không hợp lệ.");
  if (!VALID_GROUPS.has(group)) throw new Error("Nhóm nghiệp vụ không hợp lệ.");
  if (payload.enabled === true && !current[J.HANDLER_KEY]) throw new Error("Tác vụ mới chưa được gắn handler để có thể chạy an toàn.");
  const patch = { [J.UPDATED_AT]: db.fn.now(), [J.FREQUENCY]: frequency, [J.GROUP_NAME]: group };
  if (payload.time !== undefined) patch[J.TIME] = normalizeTime(payload.time);
  if (payload.enabled !== undefined) patch[J.ENABLED] = Boolean(payload.enabled);
  if (payload.selectedDays !== undefined || payload.frequency !== undefined) patch[J.SELECTED_DAYS] = JSON.stringify(normalizeDays(payload.selectedDays ?? parseDays(current[J.SELECTED_DAYS]), frequency));
  await db(TABLES.CRON_JOBS).where(J.ID, id).update(patch);
  return getJob(id);
}

async function recordExecution(jobId, { startedAt, durationMs, status, output, triggeredBy }) {
  await db(TABLES.CRON_JOB_LOGS).insert({ [L.JOB_ID]: jobId, [L.STARTED_AT]: startedAt, [L.DURATION_MS]: durationMs, [L.STATUS]: status, [L.OUTPUT]: output, [L.TRIGGERED_BY]: triggeredBy });
}

async function listLogs(jobId) {
  const job = await getJob(jobId);
  const logs = await db(TABLES.CRON_JOB_LOGS).where(L.JOB_ID, jobId).orderBy(L.STARTED_AT, "desc").limit(100);
  return logs.map((log) => ({ id: String(log[L.ID]), jobId, jobName: job[J.NAME], startedAt: log[L.STARTED_AT], durationMs: log[L.DURATION_MS], status: log[L.STATUS], output: log[L.OUTPUT], triggeredBy: log[L.TRIGGERED_BY] }));
}

module.exports = { buildCronExpression, createJob, getJob, listJobs, listLogs, recordExecution, toDto, updateJob };
