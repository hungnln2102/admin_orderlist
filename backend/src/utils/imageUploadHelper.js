const fs = require("fs");
const path = require("path");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "../../public/uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".webp"]);

const isImageFile = (filename) => {
  const ext = path.extname(filename || "").toLowerCase();
  return ALLOWED_IMAGE_EXTS.has(ext);
};

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
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
  limits: { fileSize: 2 * 1024 * 1024 }, // Max 2MB
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

const buildImageUrl = (req, filename, pathPrefix) => {
  const forwardedProto = getForwardedHeader(req, "x-forwarded-proto");
  const forwardedHost =
    getForwardedHeader(req, "x-forwarded-host") ||
    getForwardedHeader(req, "x-original-host");
  const protocol = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.get("host") || "localhost:3001";
  const base = `${protocol}://${host}`;
  return `${base}/${pathPrefix}/${encodeURIComponent(filename)}`;
};

module.exports = {
  UPLOAD_DIR,
  isImageFile,
  upload,
  buildImageUrl,
};
