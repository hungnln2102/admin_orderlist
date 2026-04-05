const db = require("../../../config/database");
const logger = require("../../../utils/logger");

/** Banner hero đang bật — storefront, không cần đăng nhập. */
exports.listActive = async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, image_url, title, description, tag_text, image_alt, button_label, button_href, sort_order
       FROM content.banners
       WHERE active = TRUE
         AND TRIM(COALESCE(image_url, '')) <> ''
         AND TRIM(COALESCE(title, '')) <> ''
       ORDER BY sort_order ASC, id ASC`
    );
    res.json({ items: rows });
  } catch (err) {
    logger.error("public/content/banners list", { error: err.message });
    res.status(500).json({ error: "Lỗi tải banner." });
  }
};
