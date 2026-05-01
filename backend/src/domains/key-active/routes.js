const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../../db");
const logger = require("../../utils/logger");
const { TABLES, COLS } = require("./constants");

const router = express.Router();

const K = COLS.ORDER_LIST_KEYS;
const O = COLS.ORDER;
const V = COLS.VARIANT;
const S = COLS.SYSTEMS;

function maskKeyDisplay(keyHint) {
  const tail = (keyHint || "").trim();
  if (!tail) return "••••••";
  return `••••${tail}`;
}

function formatExpiryDate(value) {
  if (value == null) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("vi-VN");
}

function mapRowToItem(row) {
  return {
    id: String(row.id),
    account: row.id_order || "",
    product: row.product_name || "",
    systemName: row.system_name || null,
    key: maskKeyDisplay(row.key_hint),
    expiry: formatExpiryDate(row.expires_at),
    status: row.status || "active",
  };
}

// GET /api/key-active/systems — dropdown khi tạo key
router.get("/systems", async (_req, res) => {
  try {
    const rows = await db(TABLES.systems)
      .select(
        `${TABLES.systems}.${S.SYSTEM_CODE} as system_code`,
        `${TABLES.systems}.${S.SYSTEM_NAME} as system_name`
      )
      .orderBy(S.SYSTEM_NAME, "asc");
    res.json({ items: rows });
  } catch (error) {
    logger.error("Failed to load key-active systems", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể tải danh sách hệ thống." });
  }
});

// GET /api/key-active/keys — order_list_keys JOIN order_list + variant + systems
router.get("/keys", async (_req, res) => {
  try {
    const rows = await db(`${TABLES.orderListKeys} as k`)
      .leftJoin(`${TABLES.orderList} as o`, `k.${K.ORDER_LIST_ID}`, `o.${O.ID}`)
      .leftJoin(
        `${TABLES.variant} as v`,
        db.raw(`o.${O.ID_PRODUCT}::text = v.${V.ID}::text`)
      )
      .leftJoin(`${TABLES.systems} as sys`, `k.${K.SYSTEM_CODE}`, `sys.${S.SYSTEM_CODE}`)
      .select(
        `k.${K.ID} as id`,
        `k.${K.ID_ORDER} as id_order`,
        `k.${K.KEY_HINT} as key_hint`,
        `k.${K.EXPIRES_AT} as expires_at`,
        `k.${K.STATUS} as status`,
        `k.${K.CREATED_AT} as created_at`,
        db.raw(
          `COALESCE(v.${V.DISPLAY_NAME}::text, o.${O.ID_PRODUCT}::text) as product_name`
        ),
        db.raw(`sys.${S.SYSTEM_NAME}::text as system_name`)
      )
      .orderBy(`k.${K.CREATED_AT}`, "desc");

    const items = rows.map(mapRowToItem);
    res.json({ items });
  } catch (error) {
    logger.error("Failed to load active keys", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể tải danh sách key." });
  }
});

// POST /api/key-active/keys — tạo key gắn đơn (order_list.id / mã đơn)
router.post("/keys", async (req, res) => {
  try {
    const orderCode = String(req.body?.order_code ?? req.body?.id_order ?? "")
      .trim();
    const plainKey = String(req.body?.plain_key ?? req.body?.key ?? "").trim();
    const systemCodeRaw = String(req.body?.system_code ?? "").trim();
    const systemCode = systemCodeRaw || "DEFAULT";

    if (!orderCode) {
      return res.status(400).json({ error: "Thiếu mã đơn hàng (order_code)." });
    }
    if (!plainKey || plainKey.length < 6) {
      return res
        .status(400)
        .json({ error: "Key phải có ít nhất 6 ký tự (plain_key)." });
    }

    const order = await db(TABLES.orderList)
      .whereRaw(
        `UPPER(TRIM(${TABLES.orderList}.${O.ID_ORDER})) = UPPER(TRIM(?))`,
        [orderCode]
      )
      .first();

    if (!order) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy đơn hàng với mã đã nhập." });
    }

    const existing = await db(TABLES.orderListKeys)
      .where(K.ORDER_LIST_ID, order[O.ID])
      .first();
    if (existing) {
      return res.status(409).json({
        error: "Đơn này đã có key active. Chỉ một key trên mỗi đơn.",
      });
    }

    const sys = await db(TABLES.systems)
      .where(S.SYSTEM_CODE, systemCode)
      .first();
    if (!sys) {
      return res.status(400).json({ error: "Mã hệ thống (system_code) không hợp lệ." });
    }

    const keyHash = await bcrypt.hash(plainKey, 10);
    const compact = plainKey.replace(/\s/g, "");
    const keyHint =
      compact.length <= 16 ? compact : compact.slice(-16);

    const [inserted] = await db(TABLES.orderListKeys)
      .insert({
        [K.ORDER_LIST_ID]: order[O.ID],
        [K.KEY_HASH]: keyHash,
        [K.KEY_HINT]: keyHint,
        [K.SYSTEM_CODE]: systemCode,
        [K.STATUS]: "active",
      })
      .returning("*");

    const row = Array.isArray(inserted) ? inserted[0] : inserted;
    const newId = row?.[K.ID] ?? row?.id;

    const withNames = await db(`${TABLES.orderListKeys} as k`)
      .leftJoin(`${TABLES.orderList} as o`, `k.${K.ORDER_LIST_ID}`, `o.${O.ID}`)
      .leftJoin(
        `${TABLES.variant} as v`,
        db.raw(`o.${O.ID_PRODUCT}::text = v.${V.ID}::text`)
      )
      .leftJoin(`${TABLES.systems} as sys`, `k.${K.SYSTEM_CODE}`, `sys.${S.SYSTEM_CODE}`)
      .where(`k.${K.ID}`, newId)
      .select(
        `k.${K.ID} as id`,
        `k.${K.ID_ORDER} as id_order`,
        `k.${K.KEY_HINT} as key_hint`,
        `k.${K.EXPIRES_AT} as expires_at`,
        `k.${K.STATUS} as status`,
        `k.${K.CREATED_AT} as created_at`,
        db.raw(
          `COALESCE(v.${V.DISPLAY_NAME}::text, o.${O.ID_PRODUCT}::text) as product_name`
        ),
        db.raw(`sys.${S.SYSTEM_NAME}::text as system_name`)
      )
      .first();

    const item = mapRowToItem(withNames || row);
    res.status(201).json({ item, plainKey: plainKey });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Đơn này đã có key active.",
      });
    }
    logger.error("Failed to create order_list key", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể tạo key." });
  }
});

module.exports = router;
