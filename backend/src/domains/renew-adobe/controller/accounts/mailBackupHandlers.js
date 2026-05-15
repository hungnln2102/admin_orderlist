const { db } = require("../../../../db");
const logger = require("../../../../utils/logger");
const { TABLE, COLS, MAIL_BACKUP_TABLE, MB_COLS, trimStr } = require("./shared");

const listMailBackupMailboxes = async (req, res) => {
  if (!MAIL_BACKUP_TABLE || !MB_COLS.ID) {
    return res.json([]);
  }
  try {
    const excludeAssigned =
      req.query?.exclude_assigned === "1" ||
      req.query?.exclude_assigned === "true";

    const cols = [
      MB_COLS.ID,
      MB_COLS.EMAIL,
      MB_COLS.NOTE,
      ...(MB_COLS.ALIAS_PREFIX ? [MB_COLS.ALIAS_PREFIX] : []),
    ];
    let query = db(MAIL_BACKUP_TABLE)
      .select(...cols)
      .where(MB_COLS.IS_ACTIVE, true);

    if (excludeAssigned && COLS.MAIL_BACKUP_ID) {
      const usedRaw = await db(TABLE)
        .whereNotNull(COLS.MAIL_BACKUP_ID)
        .pluck(COLS.MAIL_BACKUP_ID);
      const usedIds = [
        ...new Set(
          usedRaw
            .map((id) => Number(id))
            .filter((n) => Number.isFinite(n) && n > 0)
        ),
      ];
      if (usedIds.length) {
        query = query.whereNotIn(MB_COLS.ID, usedIds);
      }
    }

    const rows = await query.orderBy(MB_COLS.ID, "desc");
    const list = rows.map((r) => {
      const ap = MB_COLS.ALIAS_PREFIX
        ? trimStr(r[MB_COLS.ALIAS_PREFIX])
        : "";
      return {
        id: Number(r[MB_COLS.ID]),
        email: trimStr(r[MB_COLS.EMAIL]),
        alias_prefix: ap !== "" ? ap : null,
        note:
          r[MB_COLS.NOTE] != null && trimStr(r[MB_COLS.NOTE]) !== ""
            ? trimStr(r[MB_COLS.NOTE])
            : null,
      };
    });
    return res.json(list);
  } catch (err) {
    logger.error("[renew-adobe] listMailBackupMailboxes failed", {
      error: err.message,
    });
    return res
      .status(500)
      .json({ error: "Không tải được danh sách mail dự phòng." });
  }
};

const createMailBackupMailbox = async (req, res) => {
  if (!MAIL_BACKUP_TABLE || !MB_COLS.ID) {
    return res.status(400).json({ error: "Chưa cấu hình bảng mail_backup." });
  }
  if (!MB_COLS.ALIAS_PREFIX) {
    return res.status(400).json({
      error: "CSDL chưa có cột alias_prefix cho mail_backup.",
    });
  }

  const aliasPrefix = trimStr(req.body?.alias_prefix);
  if (!aliasPrefix) {
    return res.status(400).json({ error: "Thiếu alias_prefix." });
  }

  try {
    const dup = await db(MAIL_BACKUP_TABLE)
      .whereRaw(`lower(trim(coalesce(??, ''))) = ?`, [
        MB_COLS.ALIAS_PREFIX,
        aliasPrefix.toLowerCase(),
      ])
      .first();
    if (dup) {
      return res.status(409).json({
        error: "alias_prefix này đã tồn tại.",
      });
    }

    const template = await db(MAIL_BACKUP_TABLE)
      .where(MB_COLS.IS_ACTIVE, true)
      .whereNotNull(MB_COLS.EMAIL)
      .whereNotNull(MB_COLS.APP_PASSWORD)
      .orderBy(MB_COLS.ID, "asc")
      .first();

    if (
      !template ||
      !trimStr(template[MB_COLS.EMAIL]) ||
      !trimStr(template[MB_COLS.APP_PASSWORD])
    ) {
      return res.status(400).json({
        error:
          "Chưa có dòng mail_backup mẫu (email + app_password). Thêm một dòng đầy đủ trong DB trước, sau đó chỉ cần nhập alias_prefix cho các dòng tiếp theo.",
      });
    }

    const fromBodyOrTemplate = (bodyKey, colKey) => {
      const raw = req.body?.[bodyKey];
      const t = trimStr(raw);
      if (t !== "") return t;
      const fromT = template[colKey];
      return fromT != null ? trimStr(fromT) : "";
    };

    const email = fromBodyOrTemplate("email", MB_COLS.EMAIL);
    const appPassword = fromBodyOrTemplate(
      "app_password",
      MB_COLS.APP_PASSWORD
    );
    const provider = fromBodyOrTemplate("provider", MB_COLS.PROVIDER);
    const noteRaw = req.body?.note;
    const note =
      noteRaw !== undefined && noteRaw !== null && trimStr(noteRaw) !== ""
        ? trimStr(noteRaw)
        : template[MB_COLS.NOTE] != null
        ? trimStr(template[MB_COLS.NOTE]) || null
        : null;

    if (!email || !appPassword) {
      return res.status(400).json({
        error: "Thiếu email hoặc app_password (và không lấy được từ dòng mẫu).",
      });
    }

    const insertPayload = {
      [MB_COLS.EMAIL]: email,
      [MB_COLS.APP_PASSWORD]: appPassword,
      [MB_COLS.PROVIDER]: provider || "gmail",
      [MB_COLS.NOTE]: note || null,
      [MB_COLS.IS_ACTIVE]: true,
      [MB_COLS.ALIAS_PREFIX]: aliasPrefix,
      [MB_COLS.CREATED_AT]: db.fn.now(),
      [MB_COLS.UPDATED_AT]: db.fn.now(),
    };

    const [inserted] = await db(MAIL_BACKUP_TABLE)
      .insert(insertPayload)
      .returning(MB_COLS.ID);

    const newId =
      inserted && typeof inserted === "object"
        ? inserted[MB_COLS.ID]
        : inserted;

    logger.info("[renew-adobe] Created mail_backup row", {
      id: newId,
      alias_prefix: aliasPrefix,
    });
    return res.status(201).json({
      success: true,
      id: Number(newId),
      alias_prefix: aliasPrefix,
    });
  } catch (err) {
    const code = err?.code;
    if (code === "23505") {
      return res.status(409).json({ error: "alias_prefix hoặc email trùng." });
    }
    logger.error("[renew-adobe] createMailBackupMailbox failed", {
      error: err.message,
    });
    return res.status(500).json({ error: "Không tạo được hộp thư mail_backup." });
  }
};

module.exports = {
  listMailBackupMailboxes,
  createMailBackupMailbox,
};
