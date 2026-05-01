const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
  listProductDescriptions,
  createProductDescription,
  saveProductDescription,
  deleteProductDescriptionRecord,
  uploadProductImage,
  listProductImages,
  deleteProductImage,
} = require("../../controllers/ProductDescriptionsController");
const {
  auditProductSeoProxy,
} = require("../../controllers/ProductDescriptionsController/websiteSeoAudit");

const router = express.Router();

const imageDir = path.join(__dirname, "../../image");
fs.mkdirSync(imageDir, { recursive: true });

const storage = multer.diskStorage({
  destination: imageDir,
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

router.get("/", listProductDescriptions);
router.delete("/desc-variant/:id", deleteProductDescriptionRecord);
router.get("/images", listProductImages);
router.post("/seo-audit", auditProductSeoProxy);
router.post("/create", createProductDescription);
router.post("/", saveProductDescription);
router.post("/upload-image", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed." });
    }
    return uploadProductImage(req, res);
  });
});
router.delete("/images/:fileName", deleteProductImage);

module.exports = router;
