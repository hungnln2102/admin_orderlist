/**
 * Fix Ades — proxy gọi API ades.support cho frontend admin.
 * Dùng cho dropdown system_note='fix_ades'.
 */

const express = require("express");
const logger = require("../../utils/logger");
const {
  checkAdesAccount,
  checkAdesTransferStatus,
  renewAdesAccount,
} = require("../../services/fix-ades/checkService");

const router = express.Router();
const ADES_NOT_ACTIVE_HINTS = [
  "inactive",
  "not active",
  "not_active",
  "not-active",
  "chua active",
  "chưa active",
  "chua kich hoat",
  "chưa kích hoạt",
];

function isLikelyNotActivePayload(data) {
  if (!data || typeof data !== "object") return false;
  const candidates = [
    data.status,
    data.accountStatus,
    data.state,
    data.message,
    data.error,
    data.reason,
    data?.user?.status,
  ];
  return candidates.some((item) => {
    const text = String(item || "").trim().toLowerCase();
    return ADES_NOT_ACTIVE_HINTS.some((hint) => text.includes(hint));
  });
}

function normalizeCheckResultForRenewFlow(result) {
  const shouldTreatAsNoPackage =
    !result?.ok && isLikelyNotActivePayload(result?.data);
  if (!shouldTreatAsNoPackage) {
    return result;
  }
  const normalizedData =
    result?.data && typeof result.data === "object"
      ? {
          ...result.data,
          status: String(result.data.status || "inactive")
            .trim()
            .toLowerCase(),
        }
      : { status: "inactive", message: "Tài khoản chưa active." };
  return {
    ok: true,
    status: result?.status || 200,
    data: normalizedData,
  };
}

/**
 * POST /api/fix-ades/check
 * Body: { email: string }
 * Trả nguyên payload từ Ades (có data/profiles…) — frontend tự render.
 */
router.post("/check", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  if (!email) {
    return res.status(400).json({ error: "Thiếu email." });
  }
  try {
    const rawResult = await checkAdesAccount(email);
    const result = normalizeCheckResultForRenewFlow(rawResult);
    return res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      status: result.status,
      data: result.data,
    });
  } catch (error) {
    logger.error("[fix-ades] /check failed", {
      email,
      error: error?.message,
      status: error?.status,
    });
    return res.status(500).json({
      error: error?.message || "Không gọi được API Fix Ades.",
    });
  }
});


router.post("/check-transfer-status", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  if (!email) {
    return res.status(400).json({ error: "Thi?u email." });
  }
  try {
    const result = await checkAdesTransferStatus(email);
    return res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      status: result.status,
      data: result.data,
    });
  } catch (error) {
    logger.error("[fix-ades] /check-transfer-status failed", {
      email,
      error: error?.message,
      status: error?.status,
    });
    return res.status(500).json({
      error: error?.message || "Kh?ng g?i ???c API check transfer Fix Ades.",
    });
  }
});

/**
 * POST /api/fix-ades/renew
 * Body: { email: string }
 * Lưu ý: trừ slot/credit phía Ades — confirm phía UI trước khi gọi.
 */
router.post("/renew", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  if (!email) {
    return res.status(400).json({ error: "Thiếu email." });
  }
  try {
    const result = await renewAdesAccount(email);
    return res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      status: result.status,
      data: result.data,
    });
  } catch (error) {
    logger.error("[fix-ades] /renew failed", {
      email,
      error: error?.message,
      status: error?.status,
    });
    return res.status(500).json({
      error: error?.message || "Không gọi được API renew Fix Ades.",
    });
  }
});

module.exports = router;
