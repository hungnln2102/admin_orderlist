/**
 * Thêm tay đơn từ `order_list` vào `system_automation.order_user_tracking`.
 * - GET /api/renew-adobe/order-list/match  : list đơn match renew_adobe (có search), kèm cờ đã có trong tracking.
 * - POST /api/renew-adobe/user-orders/track : nhận { order_ids: string[] }, upsert vào tracking.
 *
 * Tách file riêng để không phình `userOrders.js` (read-only list).
 */

const { db } = require("@/db");
const logger = require("@/utils/logger");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("@/config/dbSchema");
const {
  TBL_ORDER,
  ORD_COLS,
} = require("@/domains/renew-adobe/controller/orderAccess");
const {
  upsertRenewAdobeOrderUserTrackingForOrderIds,
} = require("@/services/renew-adobe/orderUserTrackingService");
const {
  normalizeAdobeSystemCode,
} = require("@/services/renew-adobe/adobeSystemConstants");
const { normalizeOtpSource } = require("@/services/otpProviderService");
const {
  normalizeTrackingOtpSource,
} = require("@/domains/renew-adobe/helpers/normalizeTrackingOtpSource");

const TRACK_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.TABLE,
  SCHEMA_RENEW_ADOBE
);
const TRACK_COLS = RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.COLS;

const MAX_RESULT_ROWS = 200;
const MAX_TRACK_BATCH = 100;

/**
 * GET /api/renew-adobe/order-list/match?q=&exclude_tracked=true
 * Trả về tối đa 200 đơn từ `order_list` (không lọc variant/status — admin tự chịu trách nhiệm
 * khi thêm tay; mã đơn cần tồn tại là đủ).
 */
const listMatchableOrders = async (req, res) => {
  try {
    const qRaw = String(req.query?.q ?? "").trim();
    const excludeTracked =
      String(req.query?.exclude_tracked ?? "").toLowerCase() === "true";

    const trackedOrderIds = new Set();
    {
      const rows = await db(TRACK_TABLE).select(TRACK_COLS.ORDER_ID);
      for (const r of rows) {
        const id = String(r[TRACK_COLS.ORDER_ID] || "").trim();
        if (id) trackedOrderIds.add(id);
      }
    }

    const baseQuery = db(TBL_ORDER).select(
      ORD_COLS.ID_ORDER,
      ORD_COLS.CUSTOMER,
      ORD_COLS.CONTACT,
      ORD_COLS.INFORMATION_ORDER,
      db.raw(
        `TO_CHAR((${ORD_COLS.EXPIRY_DATE})::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as expiry_date`
      ),
      ORD_COLS.STATUS
    );

    if (qRaw) {
      const like = `%${qRaw.toLowerCase()}%`;
      baseQuery.andWhere((qb) => {
        qb.whereRaw(`LOWER(${ORD_COLS.ID_ORDER}::text) LIKE ?`, [like])
          .orWhereRaw(`LOWER(COALESCE(${ORD_COLS.CUSTOMER}::text, '')) LIKE ?`, [
            like,
          ])
          .orWhereRaw(`LOWER(COALESCE(${ORD_COLS.CONTACT}::text, '')) LIKE ?`, [
            like,
          ])
          .orWhereRaw(
            `LOWER(COALESCE(${ORD_COLS.INFORMATION_ORDER}::text, '')) LIKE ?`,
            [like]
          );
      });
    }

    const rows = await baseQuery
      .orderBy(ORD_COLS.ID_ORDER, "asc")
      .limit(MAX_RESULT_ROWS);

    const items = [];
    for (const r of rows) {
      const orderCode = String(r[ORD_COLS.ID_ORDER] || "").trim();
      if (!orderCode) continue;
      const inTracking = trackedOrderIds.has(orderCode);
      if (excludeTracked && inTracking) continue;
      items.push({
        order_code: orderCode,
        customer: r[ORD_COLS.CUSTOMER] ?? null,
        contact: r[ORD_COLS.CONTACT] ?? null,
        information_order: r[ORD_COLS.INFORMATION_ORDER] ?? null,
        expiry_date: r.expiry_date ?? null,
        status: r[ORD_COLS.STATUS] ?? null,
        in_tracking: inTracking,
      });
    }

    return res.json({ items });
  } catch (error) {
    logger.error("[renew-adobe] order-list/match failed", {
      error: error.message,
      stack: error.stack,
    });
    return res
      .status(500)
      .json({ error: "Không thể tải danh sách đơn match." });
  }
};

/**
 * POST /api/renew-adobe/user-orders/track
 * Body: { order_ids: string[] }
 * Trả: { upserted: number, requested: number, skipped: string[] }
 */
const addOrdersToTracking = async (req, res) => {
  try {
    const raw = req.body?.order_ids;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res
        .status(400)
        .json({ error: "Cần truyền order_ids (mảng mã đơn)." });
    }

    const orderIds = [
      ...new Set(
        raw
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
          .slice(0, MAX_TRACK_BATCH)
      ),
    ];

    if (orderIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Không có mã đơn hợp lệ." });
    }

    // Chỉ kiểm tra mã đơn tồn tại trong order_list (không lọc variant/status).
    const valid = await db(TBL_ORDER)
      .select(ORD_COLS.ID_ORDER)
      .whereIn(ORD_COLS.ID_ORDER, orderIds);

    const validIds = new Set(
      (valid || []).map((r) => String(r[ORD_COLS.ID_ORDER] || "").trim())
    );
    const skipped = orderIds.filter((id) => !validIds.has(id));
    const acceptedIds = orderIds.filter((id) => validIds.has(id));

    if (acceptedIds.length === 0) {
      return res.status(400).json({
        error: "Không tìm thấy mã đơn nào trong order_list.",
        skipped,
      });
    }

    const systemNote = normalizeAdobeSystemCode(
      req.body?.system_note ?? req.body?.systemNote
    );
    const otpSourceRaw = req.body?.otp_source ?? req.body?.otpSource;
    const otpSource =
      otpSourceRaw !== undefined && otpSourceRaw !== null
        ? normalizeTrackingOtpSource(otpSourceRaw)
        : null;

    const upserted = await upsertRenewAdobeOrderUserTrackingForOrderIds(
      acceptedIds,
      {
        enforceRenewAdobeVariant: false,
        systemNote,
        ...(otpSource ? { otpSource } : {}),
      }
    );

    logger.info(
      "[renew-adobe] addOrdersToTracking: requested=%d accepted=%d upserted=%d systemNote=%s",
      orderIds.length,
      acceptedIds.length,
      upserted,
      systemNote
    );

    return res.json({
      upserted,
      requested: orderIds.length,
      accepted: acceptedIds.length,
      skipped,
      system_note: systemNote,
      ...(otpSource ? { otp_source: otpSource } : {}),
    });
  } catch (error) {
    logger.error("[renew-adobe] addOrdersToTracking failed", {
      error: error.message,
      stack: error.stack,
    });
    const msg = String(error?.message || "");
    const hint =
      /otp_source/i.test(msg) && /(does not exist|column)/i.test(msg)
        ? "Database thiếu cột otp_source trên order_user_tracking — chạy migration backend mới nhất (npm run migrate)."
        : null;
    return res.status(500).json({
      error: hint || "Không thể thêm đơn vào tracking.",
    });
  }
};

/**
 * PATCH /api/renew-adobe/user-orders/:orderCode
 * Body: { system_note?: string }
 * Hiện chỉ cho sửa `system_note`. Mở rộng sau khi cần (customer/account).
 */
const updateTrackingOrder = async (req, res) => {
  try {
    const orderCode = String(req.params?.orderCode ?? "").trim();
    if (!orderCode) {
      return res.status(400).json({ error: "Thiếu orderCode." });
    }

    const updates = {};
    /** Chỉ chứa giá trị primitive — dùng cho logger (tránh JSON.stringify trên Knex Raw). */
    const loggableUpdates = {};
    if (
      req.body?.system_note !== undefined ||
      req.body?.systemNote !== undefined
    ) {
      const systemNote = normalizeAdobeSystemCode(
        req.body?.system_note ?? req.body?.systemNote
      );
      updates[TRACK_COLS.SYSTEM_NOTE] = systemNote;
      loggableUpdates.system_note = systemNote;
    }
    if (
      req.body?.otp_source !== undefined ||
      req.body?.otpSource !== undefined
    ) {
      const otpSource = normalizeTrackingOtpSource(
        req.body?.otp_source ?? req.body?.otpSource
      );
      updates[TRACK_COLS.OTP_SOURCE] = otpSource;
      loggableUpdates.otp_source = otpSource;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Không có trường nào để cập nhật." });
    }

    updates[TRACK_COLS.UPDATED_AT] = db.fn.now();

    const updated = await db(TRACK_TABLE)
      .where(TRACK_COLS.ORDER_ID, orderCode)
      .update(updates);

    if (!updated) {
      return res
        .status(404)
        .json({ error: `Không tìm thấy đơn ${orderCode} trong tracking.` });
    }

    logger.info("[renew-adobe] updateTrackingOrder", {
      orderCode,
      updates: loggableUpdates,
    });
    return res.json({
      ok: true,
      orderCode,
      updated_count: Number(updated),
    });
  } catch (error) {
    logger.error("[renew-adobe] updateTrackingOrder failed", {
      error: error.message,
      stack: error.stack,
    });
    return res
      .status(500)
      .json({ error: "Không thể cập nhật đơn trong tracking." });
  }
};

/**
 * DELETE /api/renew-adobe/user-orders/:orderCode
 * Xoá row khỏi `order_user_tracking`. Không đụng `user_account_mapping` để cron
 * sau này có thể tự upsert lại nếu cần.
 */
const deleteTrackingOrder = async (req, res) => {
  try {
    const orderCode = String(req.params?.orderCode ?? "").trim();
    if (!orderCode) {
      return res.status(400).json({ error: "Thiếu orderCode." });
    }

    const removed = await db(TRACK_TABLE)
      .where(TRACK_COLS.ORDER_ID, orderCode)
      .del();

    if (!removed) {
      return res
        .status(404)
        .json({ error: `Không tìm thấy đơn ${orderCode} trong tracking.` });
    }

    logger.info("[renew-adobe] deleteTrackingOrder", {
      orderCode,
      removed,
    });
    return res.json({ ok: true, orderCode, removed: Number(removed) });
  } catch (error) {
    logger.error("[renew-adobe] deleteTrackingOrder failed", {
      error: error.message,
      stack: error.stack,
    });
    return res
      .status(500)
      .json({ error: "Không thể xoá đơn khỏi tracking." });
  }
};

module.exports = {
  listMatchableOrders,
  addOrdersToTracking,
  updateTrackingOrder,
  deleteTrackingOrder,
};
