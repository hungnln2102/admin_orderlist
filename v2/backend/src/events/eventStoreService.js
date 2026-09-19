const { db } = require("@/db");

let ensureEventStoreTablePromise = null;

/**
 * Đảm bảo bảng lưu vết và tiếp nhận event domain_event_store tồn tại trong Database.
 */
async function ensureEventStoreTable() {
  if (!ensureEventStoreTablePromise) {
    ensureEventStoreTablePromise = (async () => {
      await db.raw(`CREATE SCHEMA IF NOT EXISTS system_automation`);
      await db.raw(`
        CREATE TABLE IF NOT EXISTS system_automation.domain_event_store (
          id BIGSERIAL PRIMARY KEY,
          event_name VARCHAR(100) NOT NULL,
          aggregate_type VARCHAR(50) NOT NULL,
          aggregate_id VARCHAR(100) NOT NULL,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          status VARCHAR(20) NOT NULL DEFAULT 'PROCESSED',
          error_message TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await db.raw(`
        CREATE INDEX IF NOT EXISTS idx_domain_event_store_event_name
        ON system_automation.domain_event_store (event_name, created_at DESC);
      `);
      await db.raw(`
        CREATE INDEX IF NOT EXISTS idx_domain_event_store_aggregate
        ON system_automation.domain_event_store (aggregate_type, aggregate_id);
      `);
    })().finally(() => {
      ensureEventStoreTablePromise = null;
    });
  }
  return ensureEventStoreTablePromise;
}

/**
 * Ghi nhận một sự kiện vào Event Store
 */
async function recordEvent({
  eventName,
  aggregateType = "ORDER",
  aggregateId,
  payload = {},
  status = "PROCESSED",
  errorMessage = null,
}) {
  await ensureEventStoreTable();

  try {
    const [inserted] = await db("system_automation.domain_event_store")
      .insert({
        event_name: eventName,
        aggregate_type: aggregateType,
        aggregate_id: String(aggregateId || ""),
        payload: JSON.stringify(payload),
        status,
        error_message: errorMessage,
        created_at: db.fn.now(),
        processed_at: db.fn.now(),
      })
      .returning("*");

    return inserted;
  } catch (err) {
    console.error(`[EventStore] Lỗi ghi nhận event ${eventName}:`, err.message);
    return null;
  }
}

module.exports = {
  ensureEventStoreTable,
  recordEvent,
};
