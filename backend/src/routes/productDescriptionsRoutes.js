const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
  listProductDescriptions,
  saveProductDescription,
  uploadProductImage,
  listProductImages,
  deleteProductImage,
} = require("../controllers/ProductDescriptionsController");

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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    return cb(null, true);
  },
});

router.get("/", listProductDescriptions);
router.get("/images", listProductImages);
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
