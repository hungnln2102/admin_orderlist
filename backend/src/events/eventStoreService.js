const { db, TABLES, COLS } = require("@/db");
const eventBus = require("./eventBus");

const E = COLS.DOMAIN_EVENT_STORE;
const SENSITIVE_KEY = /password|secret|token|cookie|authorization|credential|api[_-]?key|imap|account[_-]?number|wallet[_-]?address|sender|receiver|bank[_-]?account/i;

function redact(value, depth = 0, seen = new WeakSet()) {
  if (depth > 6) return "[MAX_DEPTH]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1, seen));
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  if (typeof value.toSQL === "function" || value.client || value._knex) return "[SQL_RAW]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(nestedValue, depth + 1, seen)])
  );
}

function buildEventRow(input, status) {
  const payload = redact(input.payload || {});

  return {
    [E.EVENT_NAME]: input.eventName,
    [E.AGGREGATE_TYPE]: input.aggregateType || "SYSTEM",
    [E.AGGREGATE_ID]: String(input.aggregateId || ""),
    [E.PAYLOAD]: JSON.stringify(payload),
    [E.ACTION]: input.action || null,
    [E.BEFORE_STATE]: input.beforeState == null ? null : JSON.stringify(redact(input.beforeState)),
    [E.AFTER_STATE]: input.afterState == null ? null : JSON.stringify(redact(input.afterState)),
    [E.CHANGED_FIELDS]: JSON.stringify(redact(input.changedFields || {})),
    [E.ACTOR_TYPE]: input.actorType || "SYSTEM",
    [E.ACTOR_ID]: input.actorId == null ? null : String(input.actorId),
    [E.SOURCE]: input.source || "SYSTEM",
    [E.REQUEST_ID]: input.requestId || null,
    [E.CORRELATION_ID]: input.correlationId || null,
    [E.IDEMPOTENCY_KEY]: input.idempotencyKey || null,
    [E.REASON]: input.reason || null,
    [E.SCHEMA_VERSION]: 1,
    [E.STATUS]: status,
    [E.ATTEMPTS]: 0,
    [E.ERROR_MESSAGE]: input.errorMessage || null,
    [E.CREATED_AT]: db.fn.now(),
    [E.PROCESSED_AT]: null,
    [E.PUBLISHED_AT]: null,
  };
}

async function insertEvent(query, input, status) {
  const [inserted] = await query(TABLES.DOMAIN_EVENT_STORE)
    .insert(buildEventRow(input, status))
    .returning("*");
  return inserted;
}

async function recordEventInTrx(trx, input) {
  if (!trx) throw new Error("recordEventInTrx requires the active database transaction");
  if (!input?.eventName) throw new Error("eventName is required");
  return insertEvent(trx, input, "PENDING");
}

async function markEventPublished(eventId, connection) {
  await connection(TABLES.DOMAIN_EVENT_STORE)
    .where({ [E.ID]: eventId })
    .update({
      [E.STATUS]: "PUBLISHED",
      [E.PUBLISHED_AT]: db.fn.now(),
      [E.PROCESSED_AT]: db.fn.now(),
      [E.ERROR_MESSAGE]: null,
    });
}

async function markEventDispatchFailed(eventId, error, connection) {
  await connection(TABLES.DOMAIN_EVENT_STORE)
    .where({ [E.ID]: eventId })
    .increment(E.ATTEMPTS, 1)
    .update({ [E.ERROR_MESSAGE]: error.message || String(error) });
}

async function dispatchStoredEventWith(event, { emitAsync, markPublishedFn, markFailedFn }) {
  const payload = {
    ...(event[E.PAYLOAD] || {}),
    auditEventId: event[E.ID],
    correlationId: event[E.CORRELATION_ID] || undefined,
  };

  try {
    await emitAsync(event[E.EVENT_NAME], payload);
    await markPublishedFn(event[E.ID]);
  } catch (error) {
    await markFailedFn(event[E.ID], error);
    throw error;
  }
}

async function dispatchStoredEvent(event) {
  const outcome = await db.transaction(async (trx) => {
    const pending = await trx(TABLES.DOMAIN_EVENT_STORE)
      .where({ [E.ID]: event[E.ID], [E.STATUS]: "PENDING" })
      .forUpdate()
      .skipLocked()
      .first();
    if (!pending) return { published: false };

    try {
      await dispatchStoredEventWith(pending, {
        emitAsync: eventBus.emitAsync.bind(eventBus),
        markPublishedFn: (id) => markEventPublished(id, trx),
        markFailedFn: (id, error) => markEventDispatchFailed(id, error, trx),
      });
      return { published: true };
    } catch (error) {
      return { error };
    }
  });
  if (outcome.error) throw outcome.error;
  return outcome.published;
}

async function publishEventInTrx(trx, input) {
  const storedEvent = await recordEventInTrx(trx, input);
  if (typeof trx.afterCommit !== "function") {
    throw new Error("publishEventInTrx requires a transaction with afterCommit support");
  }

  trx.afterCommit(() => dispatchStoredEvent(storedEvent).catch((error) => {
    console.error(`[EventStore] Unable to publish ${input.eventName}:`, error.message);
  }));

  return storedEvent;
}

async function dispatchPendingEvents({ limit = 100 } = {}) {
  const batchSize = Math.max(1, Math.min(Math.trunc(Number(limit)) || 100, 1000));
  const pending = () => db(TABLES.DOMAIN_EVENT_STORE).where(E.STATUS, "PENDING");
  const { lastId } = await pending().max({ lastId: E.ID }).first();
  if (lastId == null) return 0;

  let cursor = null;
  let published = 0;
  while (true) {
    const events = await pending()
      .where(E.ID, "<=", lastId)
      .modify((query) => {
        if (cursor !== null) query.where(E.ID, ">", cursor);
      })
      .orderBy(E.ID, "asc")
      .limit(batchSize);
    if (events.length === 0) return published;

    published += await replayPendingEvents(events);
    cursor = events[events.length - 1][E.ID];
  }
}

async function replayPendingEvents(events, dispatch = dispatchStoredEvent) {
  let published = 0;
  for (const event of events) {
    try {
      if (await dispatch(event) !== false) published += 1;
    } catch (error) {
      console.error(`[EventStore] Unable to replay event ${event[E.ID]}:`, error.message);
    }
  }
  return published;
}

async function recordEvent(input) {
  if (input?.payload?.auditEventId) {
    return { [E.ID]: input.payload.auditEventId, alreadyRecorded: true };
  }
  if (!input?.eventName) throw new Error("eventName is required");
  return insertEvent(db, input, "PUBLISHED");
}

module.exports = {
  dispatchPendingEvents,
  dispatchStoredEventWith,
  publishEventInTrx,
  recordEvent,
  recordEventInTrx,
  replayPendingEvents,
  redact,
};
