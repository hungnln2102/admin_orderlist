const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const logger = require("../../utils/logger");
const {
  clearProductImageReferences,
} = require("../../services/clearProductImageReferences");

const router = express.Router();

const IMAGE_DIR = path.join(__dirname, "../../image_product");
fs.mkdirSync(IMAGE_DIR, { recursive: true });

const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".webp"]);

const isImageFile = (filename) => {
  const ext = path.extname(filename || "").toLowerCase();
  return ALLOWED_IMAGE_EXTS.has(ext);
};

const storage = multer.diskStorage({
  destination: IMAGE_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base =
      path
        .basename(file.originalname || "image", ext)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 60) || "image";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext || ""}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/webp"];
    if (!file.mimetype || !allowed.includes(file.mimetype)) {
      return cb(new Error("Chỉ cho phép ảnh JPEG hoặc WebP (tối đa 2 MB)."));
    }
    return cb(null, true);
  },
});

const getForwardedHeader = (req, headerName) => {
  const raw = req.get(headerName);
  if (!raw) return "";
  return String(raw).split(",")[0].trim();
};

const buildImageUrl = (req, filename) => {
  const forwardedProto = getForwardedHeader(req, "x-forwarded-proto");
  const forwardedHost =
    getForwardedHeader(req, "x-forwarded-host") ||
    getForwardedHeader(req, "x-original-host");
  const protocol = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.get("host") || "localhost:3001";
  const base = `${protocol}://${host}`;
  return `${base}/image_product/${encodeURIComponent(filename)}`;
};

router.post("/upload", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      logger.error("Upload product image failed", { error: err.message });
      return res.status(400).json({ error: err.message || "Upload failed." });
    }
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    return res.json({
      fileName: req.file.filename,
      url: buildImageUrl(req, req.file.filename),
    });
  });
});

router.get("/", async (req, res) => {
  try {
    const entries = await fs.promises.readdir(IMAGE_DIR, { withFileTypes: true });
    const items = entries
      .filter((entry) => entry.isFile() && isImageFile(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        fileName: name,
        url: buildImageUrl(req, name),
      }));
    res.json({ items, count: items.length });
  } catch (error) {
    logger.error("List product images failed", { error: error.message });
    res.status(500).json({ error: "Failed to list images." });
  }
});

router.delete("/:fileName", async (req, res) => {
  const rawName = String(req.params.fileName || "").trim();
  const fileName = path.basename(rawName);
  if (!fileName || fileName !== rawName || !isImageFile(fileName)) {
    return res.status(400).json({ error: "Invalid file name." });
  }
  const targetPath = path.join(IMAGE_DIR, fileName);
  try {
    try {
      await fs.promises.unlink(targetPath);
    } catch (err) {
      if (!err || err.code !== "ENOENT") {
        throw err;
      }
    }

    const cleared = await clearProductImageReferences(fileName);
    res.json({ ok: true, cleared });
  } catch (error) {
    logger.error("Delete product image failed", { fileName, error: error.message });
    res.status(500).json({ error: "Failed to delete image." });
  }
});

module.exports = router;
