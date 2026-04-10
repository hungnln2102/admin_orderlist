const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const logger = require("../utils/logger");
const { compressArticleImageToWebp } = require("../utils/articleImageCompress");

const router = express.Router();

const ARTICLE_IMAGE_DIR = path.join(__dirname, "../../image/articles");
fs.mkdirSync(ARTICLE_IMAGE_DIR, { recursive: true });

const getForwardedHeader = (req, headerName) => {
  const raw = req.get(headerName);
  if (!raw) return "";
  return String(raw).split(",")[0].trim();
};

const buildArticleImageUrl = (req, fileName) => {
  const forwardedProto = getForwardedHeader(req, "x-forwarded-proto");
  const forwardedHost =
    getForwardedHeader(req, "x-forwarded-host") ||
    getForwardedHeader(req, "x-original-host");
  const protocol = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.get("host") || "localhost:3001";
  const base = `${protocol}://${host}`;
  return `${base}/image/articles/${encodeURIComponent(fileName)}`;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/webp"];
    if (!file.mimetype || !allowed.includes(file.mimetype)) {
      return cb(new Error("Chỉ cho phép ảnh JPEG hoặc WebP (tối đa 2 MB)."));
    }
    return cb(null, true);
  },
});

router.post("/article-image", (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      logger.error("Upload article image failed", { error: err.message });
      return res.status(400).json({ error: err.message || "Upload thất bại." });
    }
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ error: "Không có file ảnh." });
    }

    try {
      const webpBuffer = await compressArticleImageToWebp(req.file.buffer);
      const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.webp`;
      const outPath = path.join(ARTICLE_IMAGE_DIR, name);
      await fs.promises.writeFile(outPath, webpBuffer);

      return res.json({
        fileName: name,
        url: buildArticleImageUrl(req, name),
      });
    } catch (e) {
      logger.error("Article image compress failed", { error: e.message });
      return res.status(500).json({
        error: "Không xử lý được ảnh. Thử định dạng JPG/PNG/WebP khác.",
      });
    }
  });
});

module.exports = router;
