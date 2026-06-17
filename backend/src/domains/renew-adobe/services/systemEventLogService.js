const db = require("../../../config/database");
const logger = require("../../../utils/logger");
const { SCHEMA_RENEW_ADOBE, RENEW_ADOBE_SCHEMA } = require("../../../config/dbSchema");

const EVENT_LOG_DEF = RENEW_ADOBE_SCHEMA.SYSTEM_EVENT_LOGS;
const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;
const EVENT_LOG_TABLE = `${quoteIdent(SCHEMA_RENEW_ADOBE)}.${quoteIdent(EVENT_LOG_DEF.TABLE)}`;
const COLS = EVENT_LOG_DEF.COLS;

const normalizeLogType = (value) => (String(value || "system").toLowerCase() === "user" ? "user" : "system");
const normalizeLevel = (value) => {
  const level = String(value || "info").toLowerCase();
  return ["error", "warn", "info", "debug", "http"].includes(level) ? level : "info";
};

const getActorFromRequest = (req) => {
  const user = req?.session?.user || {};
  return {
    actorId: user.id != null ? String(user.id) : null,
    actorName: user.username || null,
  };
};

const buildRequestMeta = (req) => ({
  requestMethod: req?.method || null,
  requestPath: req?.originalUrl || req?.path || null,
  ipAddress: req?.ip || req?.headers?.["x-forwarded-for"] || null,
  userAgent: req?.headers?.["user-agent"] || null,
});

async function writeSystemEventLog(payload = {}) {
  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};
  const values = [
    normalizeLogType(payload.logType),
    normalizeLevel(payload.level),
    payload.action || null,
    payload.entity || null,
    payload.entityId != null ? String(payload.entityId) : null,
    String(payload.message || payload.action || "System event"),
    payload.actorId != null ? String(payload.actorId) : null,
    payload.actorName || null,
    payload.source || null,
    payload.requestMethod || null,
    payload.requestPath || null,
    payload.ipAddress || null,
    payload.userAgent || null,
    JSON.stringify(metadata),
  ];

  const sql = `
    INSERT INTO ${EVENT_LOG_TABLE} (
      ${COLS.LOG_TYPE}, ${COLS.LEVEL}, ${COLS.ACTION}, ${COLS.ENTITY}, ${COLS.ENTITY_ID},
      ${COLS.MESSAGE}, ${COLS.ACTOR_ID}, ${COLS.ACTOR_NAME}, ${COLS.SOURCE},
      ${COLS.REQUEST_METHOD}, ${COLS.REQUEST_PATH}, ${COLS.IP_ADDRESS}, ${COLS.USER_AGENT}, ${COLS.METADATA}
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
    RETURNING ${COLS.ID}
  `;

  try {
    const result = await db.query(sql, values);
    return result.rows?.[0] || null;
  } catch (error) {
    if (error?.code === "42P01") {
      logger.warn("[system-event-log] table missing, skip write", { error: error.message });
      return null;
    }
    logger.warn("[system-event-log] write failed", { error: error.message, stack: error.stack });
    return null;
  }
}

function writeUserEventLog(req, payload = {}) {
  const actor = getActorFromRequest(req);
  const requestMeta = buildRequestMeta(req);
  return writeSystemEventLog({
    ...payload,
    ...actor,
    ...requestMeta,
    logType: "user",
    level: payload.level || "info",
  });
}

module.exports = {
  writeSystemEventLog,
  writeUserEventLog,
};
