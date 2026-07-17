const {
  ORDER_COLS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  SEND_RENEWAL_TO_TOPIC,
} = require("./config");
const { sendRenewalNotification } = require("./notifications");
const {
  fetchOrderState,
  isEligibleForRenewal,
  fetchRenewalCandidates,
} = require("./renewalEligibility");

const pendingRenewalTasks = new Map();

/** Try BullMQ enqueue; returns true if job was dispatched to Redis queue. */
const tryBullMQEnqueue = async (orderCode, options = {}) => {
  try {
    const { addRenewalJob } = require("@/queues/renewalQueue");
    const result = await addRenewalJob(orderCode, options);
    if (!result) return null;
    return {
      dispatched: "bullmq",
      status: result.alreadyQueued ? "already_queued" : "queued",
      jobId: result.jobId || null,
    };
  } catch {
    return null;
  }
};

const isTelegramEnabled = () =>
  Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && SEND_RENEWAL_TO_TOPIC !== false);

const queueRenewalTask = (orderCode, options = {}) => {
  if (!orderCode) return null;
  const key = orderCode.trim();
  if (!key) return null;
  const alreadyQueued = pendingRenewalTasks.has(key);
  const existing = pendingRenewalTasks.get(key) || {};
  const task = {
    orderCode: key,
    renewalDone: existing.renewalDone || false,
    telegramDone: existing.telegramDone || false,
    lastRenewalResult: existing.lastRenewalResult || null,
    renewalAttempts: existing.renewalAttempts || 0,
    telegramAttempts: existing.telegramAttempts || 0,
    lastError: existing.lastError || null,
    forceRenewal: existing.forceRenewal || options.forceRenewal || false,
    source: options.source || existing.source || undefined,
    paymentAmount: options.paymentAmount ?? existing.paymentAmount ?? 0,
    paymentMonthKey: options.paymentMonthKey || existing.paymentMonthKey || null,
    paymentReceiptId: options.paymentReceiptId || existing.paymentReceiptId || null,
    /** Webhook gọi với true: tin nhắn BIẾN ĐỘNG THÁNG được caller gom 1 lần. */
    suppressFinanceNotify:
      options.suppressFinanceNotify === true ||
      existing.suppressFinanceNotify === true,
    suppressTelegramNotify:
      options.suppressTelegramNotify === true ||
      existing.suppressTelegramNotify === true,
  };
  task.alreadyQueued = alreadyQueued;
  pendingRenewalTasks.set(key, task);
  return task;
};

/**
 * Queue via BullMQ (Redis) if available, otherwise fall back to in-memory Map.
 * Returns { dispatched: 'bullmq' | 'memory', task }.
 */
const enqueueRenewal = async (orderCode, options = {}) => {
  if (!orderCode) return null;
  const key = String(orderCode).trim();
  if (!key) return null;

  const bullMqResult = await tryBullMQEnqueue(key, options);
  if (bullMqResult) {
    return {
      orderCode: key,
      dispatched: bullMqResult.dispatched,
      status: bullMqResult.status,
      jobId: bullMqResult.jobId,
    };
  }

  const task = queueRenewalTask(key, options);
  return {
    dispatched: "memory",
    orderCode: key,
    status: task?.alreadyQueued ? "already_queued" : "queued",
    task,
  };
};

const processRenewalTask = async (orderCode) => {
  const { runRenewal } = require("./renewal");

  const task = pendingRenewalTasks.get(orderCode);
  if (!task) return null;

  const state = await fetchOrderState(orderCode);
  if (!state) {
    pendingRenewalTasks.delete(orderCode);
    return { orderCode, skipped: true, reason: "not found" };
  }

  const { eligible, forceRenewal } = isEligibleForRenewal(
    state[ORDER_COLS.status],
    state[ORDER_COLS.expiryDate]
  );

  if (!eligible) {
    pendingRenewalTasks.delete(orderCode);
    return { orderCode, skipped: true, reason: "not eligible" };
  }

  if (!task.renewalDone) {
    try {
      const renewalResult = await runRenewal(orderCode, {
        forceRenewal: task.forceRenewal || forceRenewal,
        source: task.source,
        paymentAmount: task.paymentAmount,
        paymentMonthKey: task.paymentMonthKey,
        paymentReceiptId: task.paymentReceiptId,
        suppressFinanceNotify: task.suppressFinanceNotify === true,
      });
      task.renewalAttempts += 1;
      task.lastRenewalResult = renewalResult;
      task.renewalDone = !!renewalResult?.success;
      task.lastError = task.renewalDone ? null : renewalResult?.details || "Renewal failed";
    } catch (err) {
      task.renewalAttempts += 1;
      task.lastError = err?.message || String(err);
      return {
        orderCode,
        success: false,
        error: task.lastError,
        renewalDone: false,
        telegramDone: task.telegramDone,
      };
    }
  }

  if (task.renewalDone && !task.telegramDone && !task.suppressTelegramNotify) {
    if (!isTelegramEnabled()) {
      task.telegramDone = true;
    } else {
      try {
        await sendRenewalNotification(orderCode, task.lastRenewalResult);
        task.telegramAttempts += 1;
        task.telegramDone = true;
        task.lastError = null;
      } catch (err) {
        task.telegramAttempts += 1;
        task.lastError = err?.message || String(err);
        return {
          orderCode,
          success: false,
          error: task.lastError,
          renewalDone: true,
          telegramDone: false,
        };
      }
    }
  }

  const success = task.renewalDone && (task.telegramDone || task.suppressTelegramNotify);
  if (success) {
    pendingRenewalTasks.delete(orderCode);
  } else {
    pendingRenewalTasks.set(orderCode, task);
  }

  return {
    orderCode,
    success,
    renewalDone: task.renewalDone,
    telegramDone: task.telegramDone,
    lastError: task.lastError,
    lastRenewalResult: task.lastRenewalResult,
  };
};

const runRenewalBatch = async ({ orderCodes, forceRenewal = false } = {}) => {
  const targets =
    Array.isArray(orderCodes) && orderCodes.length
      ? orderCodes
          .map((code) => ({
            orderCode: String(code || "").trim(),
            forceRenewal,
          }))
          .filter((c) => c.orderCode)
      : await fetchRenewalCandidates();

  for (const target of targets) {
    queueRenewalTask(target.orderCode, {
      forceRenewal: target.forceRenewal,
      suppressTelegramNotify: true, // Gom tin nhắn
    });
  }

  const results = [];
  const renewalOutcomes = [];
  for (const target of targets) {
    const code = target.orderCode;
    if (!code) continue;
    const outcome = await processRenewalTask(code);
    if (outcome) {
      results.push(outcome);
      if (outcome.lastRenewalResult) {
        renewalOutcomes.push({
          orderCode: code,
          result: outcome.lastRenewalResult
        });
      }
    }
  }

  if (renewalOutcomes.length > 0) {
    const { sendGroupedRenewalNotification } = require("./notifications");
    await sendGroupedRenewalNotification(renewalOutcomes);
  }

  const succeeded = results.filter((r) => r?.success).length;
  return {
    total: targets.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
};

module.exports = {
  pendingRenewalTasks,
  queueRenewalTask,
  enqueueRenewal,
  processRenewalTask,
  runRenewalBatch,
};
