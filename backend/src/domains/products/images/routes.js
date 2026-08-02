const express = require("express");
const fs = require("fs");
const path = require("path");
const logger = require("@/utils/logger");
const {
  clearProductImageReferences,
} = require("@/services/clearProductImageReferences");
const {
  UPLOAD_DIR,
  isImageFile,
  upload,
  buildImageUrl,
} = require("@/utils/imageUploadHelper");

const router = express.Router();

router.post("/upload", (req, res) => {
  const isVariant = req.baseUrl.endsWith("variant-images") || req.baseUrl.endsWith("variant");
  const pathPrefix = isVariant ? "image_variant" : "image_product";

  upload.single("image")(req, res, (err) => {
    if (err) {
      logger.error(`Upload ${isVariant ? "variant" : "product"} image failed`, { error: err.message });
      return res.status(400).json({ error: err.message || "Upload failed." });
    }
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    return res.json({
      fileName: req.file.filename,
      url: buildImageUrl(req, req.file.filename, pathPrefix),
    });
  });
});

router.get("/", async (req, res) => {
  const isVariant = req.baseUrl.endsWith("variant-images") || req.baseUrl.endsWith("variant");
  const pathPrefix = isVariant ? "image_variant" : "image_product";

  try {
    const entries = await fs.promises.readdir(UPLOAD_DIR, { withFileTypes: true });
    const items = entries
      .filter((entry) => entry.isFile() && isImageFile(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        fileName: name,
        url: buildImageUrl(req, name, pathPrefix),
      }));
    res.json({ items, count: items.length });
  } catch (error) {
    logger.error(`List ${isVariant ? "variant" : "product"} images failed`, { error: error.message });
    res.status(500).json({ error: "Failed to list images." });
  }
});

router.delete("/:fileName", async (req, res) => {
  const isVariant = req.baseUrl.endsWith("variant-images") || req.baseUrl.endsWith("variant");
  const rawName = String(req.params.fileName || "").trim();
  const fileName = path.basename(rawName);
  if (!fileName || fileName !== rawName || !isImageFile(fileName)) {
    return res.status(400).json({ error: "Invalid file name." });
  }
  const targetPath = path.join(UPLOAD_DIR, fileName);
  try {
    try {
      await fs.promises.unlink(targetPath);
    } catch (err) {
      if (!err || err.code !== "ENOENT") {
        throw err;
      }
    }

    let cleared = null;
    if (!isVariant) {
      cleared = await clearProductImageReferences(fileName);
    }
    res.json({ ok: true, cleared });
  } catch (error) {
    logger.error(`Delete ${isVariant ? "variant" : "product"} image failed`, { fileName, error: error.message });
    res.status(500).json({ error: "Failed to delete image." });
  }
});

module.exports = router;
