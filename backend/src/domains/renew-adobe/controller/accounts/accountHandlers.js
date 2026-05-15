const { db } = require("../../../../db");
const logger = require("../../../../utils/logger");
const { findAccountMatchByEmail, normalizeEmail } = require("../accountLookup");
const { removeMappingsForAccount } = require("../../../../services/userAccountMappingService");
const { normalizeOtpSource } = require("../../../../services/otpProviderService");
const {
  removeProfileDirForEmail,
} = require("../../../../services/renew-adobe/adobe-renew-v2/shared/profileSession");
const {
  upsertRenewAdobeOrderUserTrackingForOrderIds,
  getOrderUserTrackingCountsForAdminAccounts,
} = require("../../../../services/renew-adobe/orderUserTrackingService");
const {
  TABLE,
  COLS,
  MAIL_BACKUP_TABLE,
  MB_COLS,
  EMAIL_OK,
  getEmptyFields,
  trimStr,
} = require("./shared");

const listAccounts = async (_req, res) => {
  try {
    const baseSelect = [
      `${TABLE}.${COLS.ID}`,
      `${TABLE}.${COLS.EMAIL}`,
      `${TABLE}.${COLS.PASSWORD_ENC}`,
      `${TABLE}.${COLS.ORG_NAME}`,
      `${TABLE}.${COLS.LICENSE_STATUS}`,
      `${TABLE}.${COLS.USER_COUNT}`,
      `${TABLE}.${COLS.LAST_CHECKED}`,
      `${TABLE}.${COLS.IS_ACTIVE}`,
      `${TABLE}.${COLS.CREATED_AT}`,
      `${TABLE}.${COLS.MAIL_BACKUP_ID}`,
      ...(COLS.OTP_SOURCE ? [`${TABLE}.${COLS.OTP_SOURCE}`] : []),
      ...(COLS.URL_ACCESS ? [`${TABLE}.${COLS.URL_ACCESS}`] : []),
      ...(COLS.ID_PRODUCT ? [`${TABLE}.${COLS.ID_PRODUCT}`] : []),
    ];

    let qb = db(TABLE);
    if (MAIL_BACKUP_TABLE && MB_COLS.ALIAS_PREFIX) {
      qb = qb
        .leftJoin(
          MAIL_BACKUP_TABLE,
          `${TABLE}.${COLS.MAIL_BACKUP_ID}`,
          `${MAIL_BACKUP_TABLE}.${MB_COLS.ID}`
        )
        .select(
          ...baseSelect,
          `${MAIL_BACKUP_TABLE}.${MB_COLS.ALIAS_PREFIX} as alias`
        );
    } else {
      qb = qb.select(...baseSelect, db.raw("NULL::text as alias"));
    }

    const rows = await qb.orderBy(`${TABLE}.${COLS.ID}`, "asc");
    const trackingByAccountId = await getOrderUserTrackingCountsForAdminAccounts(
      rows,
      COLS.ID,
      COLS.ORG_NAME
    );

    const withEmptyCheck = rows.map((row) => ({
      ...row,
      empty_fields: getEmptyFields(row),
      tracking_user_count:
        trackingByAccountId.get(Number(row[COLS.ID])) ?? 0,
    }));

    logger.info("[renew-adobe] List accounts", { total: withEmptyCheck.length });
    return res.json(withEmptyCheck);
  } catch (error) {
    logger.error("[renew-adobe] List accounts failed", {
      error: error.message,
    });
    return res
      .status(500)
      .json({ error: "Không thể tải danh sách tài khoản Renew Adobe." });
  }
};

const lookupAccountByEmail = async (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!email) {
    return res.status(400).json({ error: "Thiếu tham số email." });
  }

  try {
    const { account: row } = await findAccountMatchByEmail(email);
    if (!row) {
      return res.status(404).json({
        error: "Không tìm thấy tài khoản với email tương ứng.",
        account: null,
      });
    }
    return res.json({ account: row });
  } catch (error) {
    logger.error("[renew-adobe] Lookup account failed", {
      email,
      error: error.message,
    });
    return res.status(500).json({
      error: "Lỗi tra cứu tài khoản.",
      account: null,
    });
  }
};

const createAccount = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = (req.body?.password ?? "").toString();

  if (!email || !EMAIL_OK.test(email)) {
    return res.status(400).json({ error: "Email không hợp lệ." });
  }
  if (!password.trim()) {
    return res.status(400).json({ error: "Thiếu mật khẩu." });
  }

  try {
    let resolvedMailBackupId = null;
    const rawMb = req.body?.mail_backup_id;
    if (rawMb !== undefined && rawMb !== null && String(rawMb).trim() !== "") {
      const n = parseInt(String(rawMb), 10);
      if (!Number.isFinite(n) || n < 1) {
        return res
          .status(400)
          .json({ error: "Mail dự phòng (ID) không hợp lệ." });
      }
      if (!MAIL_BACKUP_TABLE) {
        return res.status(400).json({
          error: "Hệ thống chưa cấu hình bảng mail_backup.",
        });
      }
      const mbRow = await db(MAIL_BACKUP_TABLE)
        .where(MB_COLS.ID, n)
        .where(MB_COLS.IS_ACTIVE, true)
        .first();
      if (!mbRow) {
        return res.status(400).json({
          error: "Mail dự phòng không tồn tại hoặc đã tắt.",
        });
      }
      resolvedMailBackupId = n;
    }

    const existing = await db(TABLE).where(COLS.EMAIL, email).first();
    if (existing) {
      return res
        .status(409)
        .json({ error: "Email này đã có trong danh sách tài khoản admin." });
    }

    const otpSource = normalizeOtpSource(req.body?.otp_source, {
      hasMailBackupId: Number.isFinite(resolvedMailBackupId),
    });
    if (otpSource === "imap" && !Number.isFinite(resolvedMailBackupId)) {
      return res.status(400).json({
        error:
          "Nguồn OTP là IMAP thì bắt buộc phải chọn Alias (mail dự phòng).",
      });
    }

    const [inserted] = await db(TABLE)
      .insert({
        [COLS.EMAIL]: email,
        [COLS.PASSWORD_ENC]: password,
        [COLS.ORG_NAME]: null,
        [COLS.LICENSE_STATUS]: null,
        [COLS.USER_COUNT]: 0,
        [COLS.ALERT_CONFIG]: null,
        [COLS.LAST_CHECKED]: null,
        [COLS.IS_ACTIVE]: true,
        [COLS.CREATED_AT]: db.fn.now(),
        [COLS.MAIL_BACKUP_ID]: resolvedMailBackupId,
        ...(COLS.OTP_SOURCE ? { [COLS.OTP_SOURCE]: otpSource } : {}),
        ...(COLS.URL_ACCESS ? { [COLS.URL_ACCESS]: null } : {}),
      })
      .returning(COLS.ID);

    const id =
      inserted && typeof inserted === "object"
        ? inserted[COLS.ID]
        : inserted;

    logger.info("[renew-adobe] Created admin account", { id, email });
    return res.status(201).json({ success: true, id });
  } catch (error) {
    const code = error?.code;
    if (code === "23505") {
      return res
        .status(409)
        .json({ error: "Email này đã có trong danh sách tài khoản admin." });
    }
    logger.error("[renew-adobe] Create account failed", {
      email,
      error: error.message,
    });
    return res.status(500).json({
      error: "Không thể thêm tài khoản admin.",
    });
  }
};

const deleteAccount = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    return res.status(400).json({ error: "ID không hợp lệ." });
  }

  try {
    const row = await db(TABLE).where(COLS.ID, id).first();
    if (!row) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    }

    const removedMappings = await removeMappingsForAccount(id);
    const trackingOrderIds = [
      ...new Set(
        removedMappings
          .map((r) => String(r.id_order ?? "").trim())
          .filter(Boolean)
      ),
    ];

    const deleted = await db(TABLE).where(COLS.ID, id).del();
    if (!deleted) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    }

    if (trackingOrderIds.length > 0) {
      await upsertRenewAdobeOrderUserTrackingForOrderIds(trackingOrderIds).catch(
        (err) => {
          logger.warn("[renew-adobe] deleteAccount order_user_tracking: %s", err.message);
        }
      );
    }

    logger.info("[renew-adobe] Deleted admin account", {
      id,
      email: trimStr(row[COLS.EMAIL]),
    });
    try {
      const clean = removeProfileDirForEmail(row[COLS.EMAIL]);
      if (clean.removed) {
        logger.info("[renew-adobe] Deleted local profile dir", {
          id,
          email: trimStr(row[COLS.EMAIL]),
          profileDir: clean.profileDir,
        });
      }
    } catch (profileErr) {
      logger.warn("[renew-adobe] deleteAccount profile cleanup failed", {
        id,
        email: trimStr(row[COLS.EMAIL]),
        error: profileErr.message,
      });
    }
    return res.json({ success: true, id });
  } catch (err) {
    logger.error("[renew-adobe] deleteAccount failed", {
      id,
      error: err.message,
    });
    return res.status(500).json({
      error: "Không xóa được tài khoản.",
    });
  }
};

const updateUrlAccess = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID không hợp lệ." });
  }

  const urlAccess = (req.body?.access_url ?? req.body?.url_access ?? "").toString().trim();

  try {
    await db(TABLE)
      .where(COLS.ID, id)
      .update({ [COLS.URL_ACCESS]: urlAccess || null });

    return res.json({ success: true, access_url: urlAccess || null });
  } catch (err) {
    logger.error("[renew-adobe] updateUrlAccess failed", {
      id,
      error: err.message,
    });
    return res.status(500).json({ success: false, error: err.message });
  }
};

const updateAccount = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID không hợp lệ." });
  }

  const allowedFields = {
    email: COLS.EMAIL,
    password_encrypted: COLS.PASSWORD_ENC,
    org_name: COLS.ORG_NAME,
    otp_source: COLS.OTP_SOURCE,
  };

  const updates = {};
  for (const [key, col] of Object.entries(allowedFields)) {
    if (req.body?.[key] !== undefined) {
      const val = String(req.body[key] ?? "").trim();
      if (key === "email") {
        if (!val || !EMAIL_OK.test(val)) {
          return res.status(400).json({ error: "Email không hợp lệ." });
        }
      }
      if (key === "otp_source") {
        updates[col] = normalizeOtpSource(val);
        continue;
      }
      updates[col] = val || null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Không có trường nào để cập nhật." });
  }

  try {
    const [updated] = await db(TABLE)
      .where(COLS.ID, id)
      .update(updates)
      .returning("*");

    if (!updated) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    }

    return res.json({ success: true, account: updated });
  } catch (err) {
    logger.error("[renew-adobe] updateAccount failed", { id, error: err.message });
    return res.status(500).json({ error: "Cập nhật thất bại." });
  }
};

module.exports = {
  listAccounts,
  lookupAccountByEmail,
  createAccount,
  deleteAccount,
  updateUrlAccess,
  updateAccount,
};
