const fs = require("fs");
const path = require("path");
const logger = require("../../../utils/logger");
const db = require("../../../config/database");
const { SCHEMA_ORDERS, SCHEMA_FINANCE, SCHEMA_RENEW_ADOBE, ORDERS_SCHEMA, FINANCE_SCHEMA, RENEW_ADOBE_SCHEMA } = require("../../../config/dbSchema");

const logsDir = path.resolve(__dirname, "../../../../logs");

const eventLogDef = RENEW_ADOBE_SCHEMA.SYSTEM_EVENT_LOGS;
const eventLogCols = eventLogDef.COLS;

const normalizeEventLogRow = (row) => ({
  timestamp: row.created_at ? new Date(row.created_at).toISOString().replace("T", " ").slice(0, 19) : "",
  level: String(row.level || "info"),
  message: String(row.message || ""),
  sourceFile: row.source || row.entity || "system_event_logs",
  raw: row.message || "",
  action: row.action || "",
  entity: row.entity || "",
  entityId: row.entity_id || null,
  actor: row.actor_name || row.actor_id || "",
  metadata: row.metadata || {},
});

const readEventLogs = async ({ source, level, search, limit }) => {
  if (!(await tableExists(SCHEMA_RENEW_ADOBE, eventLogDef.TABLE))) return null;

  const where = [`${eventLogCols.LOG_TYPE} = $1`];
  const params = [source];

  if (level && level !== "all") {
    params.push(level);
    where.push(`${eventLogCols.LEVEL} = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(`LOWER(CONCAT_WS(' ', ${eventLogCols.CREATED_AT}, ${eventLogCols.LEVEL}, ${eventLogCols.ACTION}, ${eventLogCols.ENTITY}, ${eventLogCols.ENTITY_ID}, ${eventLogCols.MESSAGE}, ${eventLogCols.ACTOR_NAME}, ${eventLogCols.SOURCE}, ${eventLogCols.METADATA}::text)) LIKE $${params.length}`);
  }

  params.push(limit);
  const sql = `
    SELECT *
    FROM ${tableRef(SCHEMA_RENEW_ADOBE, eventLogDef.TABLE)}
    WHERE ${where.join(" AND ")}
    ORDER BY ${eventLogCols.CREATED_AT} DESC
    LIMIT $${params.length}
  `;
  const result = await db.query(sql, params);
  return result.rows.map(normalizeEventLogRow);
};

const summarizeLogs = (logs) => logs.reduce(
  (acc, item) => {
    acc.total += 1;
    const currentLevel = String(item.level || "info").toLowerCase();
    if (currentLevel === "error") acc.errors += 1;
    else if (currentLevel === "warn") acc.warnings += 1;
    else if (currentLevel === "info") acc.infos += 1;
    return acc;
  },
  { total: 0, errors: 0, warnings: 0, infos: 0 }
);


const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;
const tableRef = (schema, table) => `${quoteIdent(schema)}.${quoteIdent(table)}`;

const tableExists = async (schema, table) => {
  const result = await db.query("SELECT to_regclass($1) AS table_name", [`${schema}.${table}`]);
  return Boolean(result.rows?.[0]?.table_name);
};

const normalizeUserLogRow = (row) => ({
  timestamp: row.timestamp ? new Date(row.timestamp).toISOString().replace("T", " ").slice(0, 19) : "",
  level: "info",
  message: row.message || "Hoạt động người dùng",
  sourceFile: row.source_file || "user-activity",
  raw: row.message || "",
  action: row.action || "",
  entity: row.entity || "",
  entityId: row.entity_id || null,
  amount: row.amount || null,
  actor: row.actor || "admin",
});

const readUserActivityLogs = async ({ limit, search }) => {
  const queries = [];
  const orderDef = ORDERS_SCHEMA.ORDER_LIST;
  const orderCols = orderDef.COLS;
  const expenseDef = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES;
  const expenseCols = expenseDef.COLS;

  if (await tableExists(SCHEMA_ORDERS, orderDef.TABLE)) {
    queries.push(`
      SELECT
        ${quoteIdent(orderCols.CREATED_AT)} AS timestamp,
        'Tạo đơn hàng' AS action,
        'Đơn hàng' AS entity,
        ${quoteIdent(orderCols.ID_ORDER)}::text AS entity_id,
        COALESCE(${quoteIdent(orderCols.CUSTOMER)}::text, ${quoteIdent(orderCols.CONTACT)}::text, '') AS actor,
        ${quoteIdent(orderCols.PRICE)}::numeric AS amount,
        CONCAT('Tạo đơn hàng ', COALESCE(${quoteIdent(orderCols.ID_ORDER)}::text, ''), ' - khách: ', COALESCE(${quoteIdent(orderCols.CUSTOMER)}::text, ${quoteIdent(orderCols.CONTACT)}::text, 'không rõ')) AS message,
        'orders.order_list' AS source_file
      FROM ${tableRef(SCHEMA_ORDERS, orderDef.TABLE)}
      WHERE ${quoteIdent(orderCols.CREATED_AT)} IS NOT NULL
    `);
  }

  if (await tableExists(SCHEMA_FINANCE, expenseDef.TABLE)) {
    queries.push(`
      SELECT
        ${quoteIdent(expenseCols.CREATED_AT)} AS timestamp,
        'Tạo log chi phí' AS action,
        'Chi phí' AS entity,
        ${quoteIdent(expenseCols.ID)}::text AS entity_id,
        'admin' AS actor,
        ${quoteIdent(expenseCols.AMOUNT)}::numeric AS amount,
        CONCAT('Tạo log chi phí ', COALESCE(${quoteIdent(expenseCols.REASON)}::text, 'không có lý do'), ' - số tiền: ', COALESCE(${quoteIdent(expenseCols.AMOUNT)}::text, '0')) AS message,
        'finance.store_profit_expenses' AS source_file
      FROM ${tableRef(SCHEMA_FINANCE, expenseDef.TABLE)}
      WHERE ${quoteIdent(expenseCols.CREATED_AT)} IS NOT NULL
    `);
  }

  if (!queries.length) return [];

  const params = [];
  let sql = queries.join("\nUNION ALL\n");
  if (search) {
    params.push(`%${search}%`);
    sql = `SELECT * FROM (${sql}) user_logs WHERE LOWER(CONCAT_WS(' ', timestamp, action, entity, entity_id, actor, message, source_file)) LIKE $1`;
  } else {
    sql = `SELECT * FROM (${sql}) user_logs`;
  }
  params.push(limit);
  sql += ` ORDER BY timestamp DESC LIMIT $${params.length}`;

  const result = await db.query(sql, params);
  return result.rows.map(normalizeUserLogRow);
};

const sortLogsByTimestampDesc = (logs) => [...logs].sort((a, b) => {
  const left = a?.timestamp ? Date.parse(a.timestamp) : 0;
  const right = b?.timestamp ? Date.parse(b.timestamp) : 0;
  return right - left;
});


const parseLogLine = (line, sourceFile) => {
  const trimmed = String(line || "").trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return {
      timestamp: String(parsed.timestamp || ""),
      level: String(parsed.level || "info"),
      message: String(parsed.message || ""),
      ...parsed,
      sourceFile,
      raw: trimmed,
    };
  } catch {
    return {
      timestamp: "",
      level: "info",
      message: trimmed,
      sourceFile,
      raw: trimmed,
    };
  }
};

const readRecentLines = (filePath, limit) => {
  const text = fs.readFileSync(filePath, "utf8");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-limit)
    .map((line) => parseLogLine(line, path.basename(filePath)))
    .filter(Boolean);
};

const listSystemLogs = async (req, res) => {
  const limitParam = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 10), 300) : 100;
  const level = String(req.query.level || "all").toLowerCase();
  const source = String(req.query.source || "system").toLowerCase() === "user" ? "user" : "system";
  const search = String(req.query.search || "").trim().toLowerCase();

  try {
    const eventLogs = await readEventLogs({ source, level, search, limit });
    if (source === "user") {
      const fallbackLogs = await readUserActivityLogs({ limit, search });
      const logs = sortLogsByTimestampDesc([...(eventLogs || []), ...fallbackLogs]).slice(0, limit);
      return res.json({ logs, files: [], summary: summarizeLogs(logs), limit, level, search, source });
    }

    if (eventLogs) {
      return res.json({
        logs: eventLogs,
        files: [],
        summary: summarizeLogs(eventLogs),
        limit,
        level,
        search,
        source,
      });
    }

    if (!fs.existsSync(logsDir)) {
      return res.json({ logs: [], files: [], limit, level, search, source });
    }

    const files = fs
      .readdirSync(logsDir)
      .filter((file) => /^(app|error)-\d{4}-\d{2}-\d{2}\.log$/.test(file))
      .map((file) => path.join(logsDir, file))
      .sort((a, b) => b.localeCompare(a));

    const logs = [];
    for (const filePath of files) {
      try {
        logs.push(...readRecentLines(filePath, limit));
      } catch (error) {
        logger.warn("[renew-adobe] read log file failed", { filePath, error: error.message });
      }
    }

    const filtered = logs.filter((item) => {
      const matchesLevel = level === "all" || String(item.level || "").toLowerCase() === level;
      const haystack = `${item.timestamp} ${item.level} ${item.message} ${item.sourceFile} ${item.raw}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesLevel && matchesSearch;
    });

    const summary = summarizeLogs(filtered);

    return res.json({
      logs: filtered.slice(0, limit),
      files: files.map((file) => path.basename(file)),
      summary,
      limit,
      level,
      search,
      source,
    });
  } catch (error) {
    logger.error("[renew-adobe] listSystemLogs failed", { error: error.message, stack: error.stack });
    return res.status(500).json({ error: "Không thể tải log hệ thống." });
  }
};

module.exports = { listSystemLogs };
