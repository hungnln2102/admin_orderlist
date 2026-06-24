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
const {
  normalizeCheckResultForRenewFlow,
} = require("./helpers/renewFlowResult");

const router = express.Router();

function getTransferTeamResponse(adesData) {
  const data =
    adesData?.data && typeof adesData.data === "object" ? adesData.data : adesData;
  if (data?.transferTeamResponse && typeof data.transferTeamResponse === "object") {
    return data.transferTeamResponse;
  }
  if (
    data?.adesSource?.transferTeamResponse &&
    typeof data.adesSource.transferTeamResponse === "object"
  ) {
    return data.adesSource.transferTeamResponse;
  }
  return null;
}

function normalizeTransferStatusData(adesData) {
  const transfer = getTransferTeamResponse(adesData);
  if (!transfer) return adesData;
  return {
    ...adesData,
    email: transfer.email || adesData?.email,
    teamName: transfer.teamName || adesData?.teamName,
    status: transfer.status || adesData?.status,
    organizationId: transfer.organizationId || adesData?.organizationId,
    switchAvailable: transfer.switchAvailable,
    switchTargetTeamName: transfer.switchTargetTeamName,
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
    return res.status(400).json({ error: "Thiếu email." });
  }
  try {
    const result = await checkAdesTransferStatus(email);
    const data = normalizeTransferStatusData(result.data);
    return res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      status: result.status,
      data,
    });
  } catch (error) {
    logger.error("[fix-ades] /check-transfer-status failed", {
      email,
      error: error?.message,
      status: error?.status,
    });
    return res.status(500).json({
      error: error?.message || "Không gọi được API check transfer Fix Ades.",
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
