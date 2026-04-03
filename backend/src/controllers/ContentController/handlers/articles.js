const db = require("../../../config/database");
const logger = require("../../../utils/logger");

exports.list = async (req, res) => {
  try {
    const { search, status, category_id, page = 1, limit = 20 } = req.query;
    const params = [];
    const wheres = [];
    let idx = 0;

    if (search) {
      idx++;
      wheres.push(`(a.title ILIKE $${idx} OR c.name ILIKE $${idx})`);
      params.push(`%${search}%`);
    }
    if (status) {
      idx++;
      wheres.push(`a.status = $${idx}`);
      params.push(status);
    }
    if (category_id) {
      idx++;
      wheres.push(`a.category_id = $${idx}`);
      params.push(Number(category_id));
    }

    const where = wheres.length ? `WHERE ${wheres.join(" AND ")}` : "";
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const countQ = await db.query(
      `SELECT COUNT(*)::int AS total FROM content.articles a
       LEFT JOIN content.article_categories c ON c.id = a.category_id ${where}`,
      params
    );
    const total = countQ.rows[0].total;

    idx++;
    params.push(Number(limit));
    idx++;
    params.push(offset);

    const { rows } = await db.query(
      `SELECT a.id, a.title, a.slug, a.summary, a.image_url, a.status,
              a.published_at, a.created_at, a.updated_at,
              a.category_id,
              COALESCE(c.name, '') AS category
       FROM content.articles a
       LEFT JOIN content.article_categories c ON c.id = a.category_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx - 1} OFFSET $${idx}`,
      params
    );

    res.json({ items: rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    logger.error("content/articles list", { error: err.message });
    res.status(500).json({ error: "Lỗi tải bài viết." });
  }
};

exports.getById = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT a.*, COALESCE(c.name, '') AS category
       FROM content.articles a
       LEFT JOIN content.article_categories c ON c.id = a.category_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy." });
    res.json(rows[0]);
  } catch (err) {
    logger.error("content/articles getById", { error: err.message });
    res.status(500).json({ error: "Lỗi tải bài viết." });
  }
};

exports.create = async (req, res) => {
  const { title, slug, summary, content, image_url, category_id, status } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Tiêu đề bắt buộc." });
  try {
    const finalSlug = (slug || title).trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const pubStatus = status === "published" ? "published" : "draft";
    const publishedAt = pubStatus === "published" ? new Date().toISOString() : null;

    const { rows } = await db.query(
      `INSERT INTO content.articles
         (title, slug, summary, content, image_url, category_id, status, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        title.trim(), finalSlug, (summary || "").trim(),
        (content || "").trim(), (image_url || "").trim(),
        category_id || null, pubStatus, publishedAt,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Slug đã tồn tại." });
    logger.error("content/articles create", { error: err.message });
    res.status(500).json({ error: "Lỗi tạo bài viết." });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { title, slug, summary, content, image_url, category_id, status } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Tiêu đề bắt buộc." });
  try {
    const finalSlug = (slug || title).trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const pubStatus = status === "published" ? "published" : "draft";

    const existing = await db.query("SELECT published_at, status FROM content.articles WHERE id = $1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Không tìm thấy." });

    let publishedAt = existing.rows[0].published_at;
    if (pubStatus === "published" && existing.rows[0].status !== "published") {
      publishedAt = new Date().toISOString();
    } else if (pubStatus === "draft") {
      publishedAt = null;
    }

    const { rows } = await db.query(
      `UPDATE content.articles
       SET title=$1, slug=$2, summary=$3, content=$4, image_url=$5,
           category_id=$6, status=$7, published_at=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [
        title.trim(), finalSlug, (summary || "").trim(),
        (content || "").trim(), (image_url || "").trim(),
        category_id || null, pubStatus, publishedAt, id,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Slug đã tồn tại." });
    logger.error("content/articles update", { error: err.message });
    res.status(500).json({ error: "Lỗi cập nhật bài viết." });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      "DELETE FROM content.articles WHERE id = $1", [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Không tìm thấy." });
    res.json({ ok: true });
  } catch (err) {
    logger.error("content/articles delete", { error: err.message });
    res.status(500).json({ error: "Lỗi xóa bài viết." });
  }
};
