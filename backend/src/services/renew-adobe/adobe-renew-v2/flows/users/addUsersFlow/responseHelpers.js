function normalizeBatchResult(userEmails, status, rawBody) {
  let parsed = null;
  try {
    parsed = JSON.parse(rawBody || "null");
  } catch (_) {
    parsed = null;
  }

  if (!Array.isArray(parsed)) {
    if (status >= 200 && status < 300) {
      return {
        done: [...userEmails],
        failed: [],
      };
    }
    return {
      done: [],
      failed: userEmails.map((email) => ({
        email,
        reason: `http_${status}`,
      })),
    };
  }

  const done = [];
  const failed = [];

  parsed.forEach((item, idx) => {
    const fallbackEmail = userEmails[idx];
    const email = String(item?.request?.email || fallbackEmail || "").trim().toLowerCase();
    if (!email) return;

    const code = Number(item?.responseCode);
    if (Number.isFinite(code) && code >= 200 && code < 300) {
      done.push(email);
      return;
    }

    const errCode = String(item?.response?.errorCode || `http_${status}`);
    failed.push({ email, reason: errCode });
  });

  const touched = new Set([...done, ...failed.map((x) => x.email)]);
  for (const email of userEmails) {
    if (!touched.has(email)) {
      failed.push({ email, reason: "unknown_batch_result" });
    }
  }

  return { done, failed };
}

function extractUserIdFromAbpCreateBody(rawBody) {
  try {
    const parsed = JSON.parse(rawBody || "{}");
    return String(parsed?.id || "").trim() || null;
  } catch (_) {
    return null;
  }
}

function normalizeAbpReason(status, rawBody) {
  try {
    const parsed = JSON.parse(rawBody || "{}");
    const detail = String(parsed?.detail || "").trim();
    if (detail) return detail;
    const type = String(parsed?.type || "").trim();
    if (type) return type.split("/").pop() || `http_${status}`;
  } catch (_) {}
  return `http_${status}`;
}

function safeBodyPreview(rawBody, limit = 500) {
  const text = String(rawBody || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
}

function extractApiErrorCode(rawBody) {
  try {
    const parsed = JSON.parse(rawBody || "{}");
    const code = String(parsed?.errorCode || parsed?.code || "").trim();
    return code || "";
  } catch (_) {
    return "";
  }
}

function isTrialAlreadyConsumedFromPatch(reason, rawBody) {
  if (String(reason || "").toLowerCase() === "trial_already_consumed") {
    return true;
  }
  if (String(extractApiErrorCode(rawBody) || "").toUpperCase() === "TRIAL_ALREADY_CONSUMED") {
    return true;
  }
  try {
    const parsed = JSON.parse(rawBody || "null");
    const arr = Array.isArray(parsed) ? parsed : [];
    for (const item of arr) {
      const c = String(item?.response?.errorCode || item?.errorCode || "").toUpperCase();
      if (c === "TRIAL_ALREADY_CONSUMED") return true;
    }
  } catch (_) {
    /* ignore */
  }
  if (String(rawBody || "").toLowerCase().includes("trial_already_consumed")) {
    return true;
  }
  return false;
}

module.exports = {
  normalizeBatchResult,
  extractUserIdFromAbpCreateBody,
  normalizeAbpReason,
  safeBodyPreview,
  extractApiErrorCode,
  isTrialAlreadyConsumedFromPatch,
};
