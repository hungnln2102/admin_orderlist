const db = require("../../../config/database");
const logger = require("../../../utils/logger");

function normalizeButtonPair(label, href) {
  const l = label !== undefined && label !== null ? String(label).trim() : "";
  const h = href !== undefined && href !== null ? String(href).trim() : "";
  if (!l || !h) {
    return { button_label: null, button_href: null };
  }
  return { button_label: l, button_href: h };
}

function strField(body, key, fallback = "") {
  if (body[key] === undefined || body[key] === null) return fallback;
  return String(body[key]).trim();
}

exports.list = async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM content.banners ORDER BY sort_order, id`
    );
    res.json(rows);
  } catch (err) {
    logger.error("content/banners list", { error: err.message });
    res.status(500).json({ error: "Lỗi tải banner." });
  }
};

exports.create = async (req, res) => {
  const title = strField(req.body, "title");
  const imageUrl = strField(req.body, "image_url");
  if (!imageUrl) {
    return res.status(400).json({ error: "URL ảnh bắt buộc." });
  }
  if (!title) {
    return res.status(400).json({ error: "Tiêu đề bắt buộc." });
  }
  const description = strField(req.body, "description");
  const tagText = strField(req.body, "tag_text");
  const imageAlt = strField(req.body, "image_alt");
  const btn = normalizeButtonPair(req.body.button_label, req.body.button_href);
  try {
    const { rows } = await db.query(
      `INSERT INTO content.banners (
         image_url, title, description, tag_text, image_alt,
         button_label, button_href, sort_order
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         (SELECT COALESCE(MAX(sort_order),0)+1 FROM content.banners)
       )
       RETURNING *`,
      [
        imageUrl,
        title,
        description,
        tagText,
        imageAlt,
        btn.button_label,
        btn.button_href,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error("content/banners create", { error: err.message });
    res.status(500).json({ error: "Lỗi tạo banner." });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: existing } = await db.query(
      `SELECT * FROM content.banners WHERE id = $1`,
      [id]
    );
    if (!existing.length) return res.status(404).json({ error: "Không tìm thấy." });
    const cur = existing[0];

    const nextImage =
      req.body.image_url !== undefined
        ? strField(req.body, "image_url")
        : cur.image_url;
    if (!nextImage) {
      return res.status(400).json({ error: "URL ảnh không được để trống." });
    }

    const nextTitle =
      req.body.title !== undefined ? strField(req.body, "title") : cur.title;
    if (!nextTitle) {
      return res.status(400).json({ error: "Tiêu đề không được để trống." });
    }

    const nextDescription =
      req.body.description !== undefined
        ? strField(req.body, "description")
        : cur.description ?? "";
    const nextTag =
      req.body.tag_text !== undefined ? strField(req.body, "tag_text") : cur.tag_text ?? "";
    const nextAlt =
      req.body.image_alt !== undefined ? strField(req.body, "image_alt") : cur.image_alt ?? "";

    let btnLabel = cur.button_label;
    let btnHref = cur.button_href;
    if (req.body.button_label !== undefined || req.body.button_href !== undefined) {
      const merged = normalizeButtonPair(
        req.body.button_label !== undefined ? req.body.button_label : cur.button_label,
        req.body.button_href !== undefined ? req.body.button_href : cur.button_href
      );
      btnLabel = merged.button_label;
      btnHref = merged.button_href;
    }

    const { rows } = await db.query(
      `UPDATE content.banners
       SET image_url=$1, title=$2, description=$3, tag_text=$4, image_alt=$5,
           button_label=$6, button_href=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [nextImage, nextTitle, nextDescription, nextTag, nextAlt, btnLabel, btnHref, id]
    );
    res.json(rows[0]);
  } catch (err) {
    logger.error("content/banners update", { error: err.message });
    res.status(500).json({ error: "Lỗi cập nhật banner." });
  }
};

exports.toggle = async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE content.banners SET active = NOT active, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy." });
    res.json(rows[0]);
  } catch (err) {
    logger.error("content/banners toggle", { error: err.message });
    res.status(500).json({ error: "Lỗi bật/tắt banner." });
  }
};

exports.reorder = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: "Danh sách id bắt buộc." });
  }
  try {
    const cases = ids.map((id, i) => `WHEN ${Number(id)} THEN ${i + 1}`).join(" ");
    const idList = ids.map(Number).join(",");
    await db.query(
      `UPDATE content.banners SET sort_order = CASE id ${cases} END, updated_at = NOW()
       WHERE id IN (${idList})`
    );
    const { rows } = await db.query(
      "SELECT * FROM content.banners ORDER BY sort_order, id"
    );
    res.json(rows);
  } catch (err) {
    logger.error("content/banners reorder", { error: err.message });
    res.status(500).json({ error: "Lỗi sắp xếp banner." });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      "DELETE FROM content.banners WHERE id = $1", [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Không tìm thấy." });
    res.json({ ok: true });
  } catch (err) {
    logger.error("content/banners delete", { error: err.message });
    res.status(500).json({ error: "Lỗi xóa banner." });
  }
};
