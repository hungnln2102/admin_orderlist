const { db } = require("@/db");
const logger = require("@/utils/logger");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("@/config/dbSchema");
const { TBL_ORDER, ORD_COLS } = require("@/domains/renew-adobe/controller/orderAccess");

const TRACK_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.TABLE,
  SCHEMA_RENEW_ADOBE
);
const TRACK_COLS = RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.COLS;
const MAP_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING.TABLE,
  SCHEMA_RENEW_ADOBE
);
const MAP_COLS = RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING.COLS;
const ACC_TABLE = tableName(RENEW_ADOBE_SCHEMA.ACCOUNT.TABLE, SCHEMA_RENEW_ADOBE);
const ACC_COLS = RENEW_ADOBE_SCHEMA.ACCOUNT.COLS;

let otpSourceColumnExistsCache = null;

async function trackingHasOtpSourceColumn() {
  if (otpSourceColumnExistsCache !== null) return otpSourceColumnExistsCache;
  if (!TRACK_COLS.OTP_SOURCE) {
    otpSourceColumnExistsCache = false;
    return false;
  }
  try {
    const row = await db.raw(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = ?
        AND column_name = ?
      LIMIT 1
      `,
      [SCHEMA_RENEW_ADOBE, RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.TABLE, TRACK_COLS.OTP_SOURCE]
    );
    otpSourceColumnExistsCache = Boolean(row?.rows?.length);
  } catch {
    otpSourceColumnExistsCache = false;
  }
  return otpSourceColumnExistsCache;
}

/**
 * Nguồn dữ liệu là `order_user_tracking` (bảng tracking) — không lọc renew_adobe variant
 * để đơn admin tự thêm tay (không thuộc nhóm renew_adobe) vẫn hiển thị.
 *
 * Các bảng JOIN bổ sung:
 * - order_list (o): lấy customer/contact/status/expiry hiện tại (fallback về tracking nếu thiếu).
 * - user_account_mapping (m): map email ↔ adobe_account_id theo cặp (order_id, email).
 * - accounts_admin (acc): tên org & license_status của admin Adobe.
 */
const listUserOrders = async (_req, res) => {
  try {
    const hasOtpSource = await trackingHasOtpSourceColumn();

    const rows = await db({ t: TRACK_TABLE })
      .leftJoin({ o: TBL_ORDER }, function joinOrder() {
        this.on(
          db.raw("CAST(?? AS TEXT)", [`o.${ORD_COLS.ID_ORDER}`]),
          "=",
          `t.${TRACK_COLS.ORDER_ID}`
        );
      })
      .leftJoin({ m: MAP_TABLE }, function joinMap() {
        this.on(
          `t.${TRACK_COLS.ORDER_ID}`,
          "=",
          db.raw("CAST(?? AS TEXT)", [`m.${MAP_COLS.ORDER_ID}`])
        ).andOn(
          db.raw(`LOWER(TRIM(COALESCE(??, '')))`, [`m.${MAP_COLS.USER_EMAIL}`]),
          "=",
          db.raw(`LOWER(TRIM(COALESCE(??, '')))`, [`t.${TRACK_COLS.ACCOUNT}`])
        );
      })
      .leftJoin({ acc: ACC_TABLE }, `acc.${ACC_COLS.ID}`, `m.${MAP_COLS.ADOBE_ACCOUNT_ID}`)
      .select(
        `t.${TRACK_COLS.ORDER_ID} as order_code`,
        db.raw(
          `COALESCE(o.${ORD_COLS.INFORMATION_ORDER}, t.${TRACK_COLS.ACCOUNT}) as information_order`
        ),
        db.raw(
          `COALESCE(o.${ORD_COLS.CUSTOMER}, t.${TRACK_COLS.CUSTOMER}) as customer`
        ),
        `o.${ORD_COLS.CONTACT} as contact`,
        db.raw(
          `TO_CHAR(COALESCE((o.${ORD_COLS.EXPIRY_DATE})::timestamptz, (t.${TRACK_COLS.EXPIRED})::timestamptz) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as expiry_date`
        ),
        `o.${ORD_COLS.STATUS} as status`,
        `t.${TRACK_COLS.ORG_NAME} as tracking_org_name`,
        `t.${TRACK_COLS.STATUS} as tracking_status`,
        `t.${TRACK_COLS.ID_PRODUCT} as tracking_id_product`,
        `t.${TRACK_COLS.SYSTEM_NOTE} as system_note`,
        ...(hasOtpSource
          ? [`t.${TRACK_COLS.OTP_SOURCE} as otp_source`]
          : [db.raw(`'imap' as otp_source`)]),
        `m.${MAP_COLS.ADOBE_ACCOUNT_ID} as adobe_account_id`,
        `acc.${ACC_COLS.LICENSE_STATUS} as admin_license_status`,
        `acc.${ACC_COLS.ORG_NAME} as admin_org_name`
      )
      .orderBy(`t.${TRACK_COLS.ORDER_ID}`, "asc");

    logger.info("[renew-adobe] user-orders (from tracking): %d rows", rows.length);
    return res.json(rows);
  } catch (error) {
    logger.error("[renew-adobe] user-orders failed", {
      error: error.message,
      stack: error.stack,
    });
    return res
      .status(500)
      .json({ error: "Không thể tải danh sách user-orders." });
  }
};

module.exports = {
  listUserOrders,
};
