/**
 * Public proxy Fix Ades cho Website storefront.
 *
 * Cả 2 endpoint check + renew đều bắt buộc verify trước:
 *   `order_user_tracking.account = email` AND `system_note = 'fix_ades'`.
 * Nếu không khớp → 403, tránh user gọi trực tiếp lên Ades trừ slot/credit của shop.
 *
 * Mount tại `/api/renew-adobe/public/fix-ades/*` (cùng namespace public, đã được Website proxy sẵn).
 */

const { db } = require("../../../db");
const logger = require("../../../utils/logger");
const { normalizeEmail } = require("../helpers/email");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("../../../config/dbSchema");
const {
  checkAdesAccount,
  checkAdesTransferStatus,
  renewAdesAccount,
  syncAdesAccount,
} = require("../../../services/fix-ades/checkService");
const {
  isLikelyNotActivePayload,
  normalizeCheckResultForRenewFlow,
} = require("../../fix-ades/helpers/renewFlowResult");

const TRACK_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.TABLE,
  SCHEMA_RENEW_ADOBE
);
const TRACK_COLS = RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.COLS;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIX_ADES_CODE = "fix_ades";

const ADES_ACTIVE_STATUSES = new Set([
  "active",
  "processing",
  "paid",
  "success",
  "đang hoạt động",
  "đang xử lý",
]);
const ADES_DEAD_STATUSES = new Set([
  "error",
  "expired",
  "inactive",
  "not active",
  "not_active",
  "not-active",
  "pending",
  "hết hạn",
  "hết gói",
]);

function isAdesSyncRequiredPayload(adesData) {
  const data = adesData?.data && typeof adesData.data === "object" ? adesData.data : adesData;
  if (!data || typeof data !== "object") return false;

  const existedInSystem = Boolean(
    data.existedInSystem || data?.adesSource?.existedInSystem
  );
  const hasTransferTeamResponseField =
    Object.prototype.hasOwnProperty.call(data, "transferTeamResponse") ||
    Boolean(
      data.adesSource &&
        typeof data.adesSource === "object" &&
        Object.prototype.hasOwnProperty.call(data.adesSource, "transferTeamResponse")
    );

  return existedInSystem && hasTransferTeamResponseField && !getTransferTeamResponse(data);
}

function getTransferTeamResponse(adesData) {
  const data = adesData?.data && typeof adesData.data === "object" ? adesData.data : adesData;
  const transfer =
    data?.transferTeamResponse && typeof data.transferTeamResponse === "object"
      ? data.transferTeamResponse
      : data?.adesSource?.transferTeamResponse &&
          typeof data.adesSource.transferTeamResponse === "object"
        ? data.adesSource.transferTeamResponse
        : null;
  return transfer;
}

function normalizeTransferDataForTracking(adesData) {
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

/** Map status từ Ades sang chuỗi `tracking_status` hợp lệ theo DB constraint. */
function mapAdesStatusToTracking(status) {
  const s = String(status || "").trim().toLowerCase();
  // Quy ước fix ADES: chỉ các status active dưới đây mới là "có gói".
  // Mọi case còn lại coi là chưa có quyền sử dụng để đi luồng Renew.
  if (ADES_ACTIVE_STATUSES.has(s)) return "có gói";
  if (ADES_DEAD_STATUSES.has(s)) return "chưa cấp quyền";
  return "chưa cấp quyền";
}


/**
 * Sync kết quả check từ Ades về `order_user_tracking`:
 * - `org_name`  ← `teamName`
 * - `id_product`← `productName` (fallback `groupName`)
 * - `status`    ← map từ Ades status
 */
async function syncTrackingFromAdesCheckData(email, adesData, trackingRow) {
  const teamName =
    typeof adesData?.teamName === "string" ? adesData.teamName.trim() : "";
  const productName =
    typeof adesData?.productName === "string"
      ? adesData.productName.trim()
      : typeof adesData?.groupName === "string"
        ? adesData.groupName.trim()
        : "";
  const trackingStatus = mapAdesStatusToTracking(adesData?.status);

  try {
    await applyFixAdesTrackingFilter(db(TRACK_TABLE), email, trackingRow)
      .update({
        ...(teamName ? { [TRACK_COLS.ORG_NAME]: teamName } : {}),
        ...(productName ? { [TRACK_COLS.ID_PRODUCT]: productName } : {}),
        [TRACK_COLS.STATUS]: trackingStatus,
        [TRACK_COLS.UPDATED_AT]: db.fn.now(),
      });
  } catch (err) {
    logger.warn("[fix-ades/public] sync tracking from check failed", {
      email,
      error: err?.message,
    });
  }
}

function applyFixAdesTrackingFilter(query, email, trackingRow) {
  const scopedQuery = query
    .whereRaw(`LOWER(TRIM(COALESCE(??, ''))) = ?`, [TRACK_COLS.ACCOUNT, email])
    .where(TRACK_COLS.SYSTEM_NOTE, FIX_ADES_CODE);
  const orderId = trackingRow?.[TRACK_COLS.ORDER_ID];
  if (orderId != null && String(orderId).trim() !== "") {
    scopedQuery.andWhere(TRACK_COLS.ORDER_ID, orderId);
  }
  return scopedQuery;
}


/** Tìm 1 row tracking khớp email + system_note=fix_ades. */
async function findFixAdesTrackingRow(email) {
  return db(TRACK_TABLE)
    .select(TRACK_COLS.ORDER_ID, TRACK_COLS.ACCOUNT, TRACK_COLS.SYSTEM_NOTE)
    .whereRaw(`LOWER(TRIM(COALESCE(??, ''))) = ?`, [TRACK_COLS.ACCOUNT, email])
    .where(TRACK_COLS.SYSTEM_NOTE, FIX_ADES_CODE)
    .orderBy(TRACK_COLS.UPDATED_AT, "desc")
    .first();
}

async function ensureFixAdesEligible(email, res) {
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ ok: false, error: "Email không hợp lệ." });
    return null;
  }
  const row = await findFixAdesTrackingRow(email);
  if (!row) {
    res.status(403).json({
      ok: false,
      error:
        "Email không thuộc hệ thống Fix Ades hoặc chưa được kích hoạt. Vui lòng kiểm tra lại.",
    });
    return null;
  }
  return row;
}

const publicCheckFixAdes = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: "Email kh?ng h?p l?." });
  }
  const eligible = await findFixAdesTrackingRow(email);
  try {
    const rawResult = await checkAdesTransferStatus(email);
    const result = normalizeCheckResultForRenewFlow(rawResult);

    if (!eligible && !isAdesSyncRequiredPayload(result.data)) {
      return res.status(403).json({
        ok: false,
        error:
          "Email kh?ng thu?c h? th?ng Fix Ades ho?c ch?a ???c k?ch ho?t. Vui l?ng ki?m tra l?i.",
      });
    }

    if (eligible && result.data && typeof result.data === "object") {
      const normalizedData = normalizeTransferDataForTracking(result.data);
      await syncTrackingFromAdesCheckData(
        email,
        normalizedData,
        eligible
      );
      result.data = normalizedData;
    }
    return res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      status: result.status,
      data: result.data,
    });
  } catch (error) {
    logger.error("[fix-ades/public] check failed email=%s", email, {
      email,
      error: error?.message,
      status: error?.status,
    });
    return res.status(500).json({
      ok: false,
      error: error?.message || "Không gọi được API Fix Ades.",
    });
  }
};

async function syncTrackingFromAdesRenewData(email, adesData, trackingRow) {
  if (!adesData || adesData.success !== true) return;
  const user = adesData.user || {};
  const products = Array.isArray(user.products) ? user.products : [];
  const productName = products.length > 0 ? String(products[0]).trim() : "";
  try {
    await applyFixAdesTrackingFilter(db(TRACK_TABLE), email, trackingRow)
      .update({
        ...(productName ? { [TRACK_COLS.ID_PRODUCT]: productName } : {}),
        [TRACK_COLS.STATUS]: "có gói",
        [TRACK_COLS.UPDATED_AT]: db.fn.now(),
      });
  } catch (err) {
    logger.warn("[fix-ades/public] sync tracking from renew failed", {
      email,
      error: err?.message,
    });
  }
}

const publicRenewFixAdes = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const eligible = await ensureFixAdesEligible(email, res);
  if (!eligible) return;
  try {
    const result = await renewAdesAccount(email);
    if (result.ok && result.data && typeof result.data === "object") {
      await syncTrackingFromAdesRenewData(email, result.data, eligible);
    }
    return res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      status: result.status,
      data: result.data,
    });
  } catch (error) {
    logger.error("[fix-ades/public] renew failed email=%s", email, {
      email,
      error: error?.message,
      status: error?.status,
    });
    return res.status(500).json({
      ok: false,
      error: error?.message || "Không gọi được API renew Fix Ades.",
    });
  }
};

const publicSyncFixAdes = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const eligible = await ensureFixAdesEligible(email, res);
  if (!eligible) return;
  try {
    const result = await syncAdesAccount(email);
    if (result.ok) {
      const checkResult = await checkAdesTransferStatus(email).catch((err) => {
        logger.warn("[fix-ades/public] check after sync failed", {
          email,
          error: err?.message,
        });
        return null;
      });
      if (checkResult?.ok && checkResult.data && typeof checkResult.data === "object") {
        const normalizedData = normalizeTransferDataForTracking(checkResult.data);
        await syncTrackingFromAdesCheckData(email, normalizedData, eligible);
      }
    }
    return res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      status: result.status,
      data: result.data,
    });
  } catch (error) {
    logger.error("[fix-ades/public] sync failed email=%s", email, {
      email,
      error: error?.message,
      status: error?.status,
    });
    return res.status(500).json({
      ok: false,
      error: error?.message || "Không gọi được API đồng bộ Fix Ades.",
    });
  }
};

module.exports = {
  publicCheckFixAdes,
  publicRenewFixAdes,
  publicSyncFixAdes,
  __test__: {
    mapAdesStatusToTracking,
    isAdesSyncRequiredPayload,
    isLikelyNotActivePayload,
    normalizeCheckResultForRenewFlow,
    applyFixAdesTrackingFilter,
  },
};
