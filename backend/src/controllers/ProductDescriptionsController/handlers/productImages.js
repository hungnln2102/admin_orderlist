const fs = require("fs");
const path = require("path");
const logger = require("../../../utils/logger");
const { normalizeTextInput } = require("../../../utils/normalizers");
const { IMAGE_DIR, isImageFile } = require("../shared/constants");
const { buildImageUrl } = require("../shared/urlHelpers");

const uploadProductImage = (req, res) => {
  if (!req.file || !req.file.filename) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  return res.json({
    fileName: req.file.filename,
    url: buildImageUrl(req, req.file.filename),
  });
};

const listProductImages = async (req, res) => {
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
    logger.error(
      "List images failed (GET /api/product-descriptions/images)",
      { error: error.message, stack: error.stack }
    );
    res.status(500).json({ error: "Failed to list images." });
  }
};

const deleteProductImage = async (req, res) => {
  const rawName = normalizeTextInput(req.params.fileName || "");
  const fileName = path.basename(rawName);
  if (!fileName || fileName !== rawName || !isImageFile(fileName)) {
    return res.status(400).json({ error: "Invalid file name." });
  }
  const targetPath = path.join(IMAGE_DIR, fileName);
  try {
    await fs.promises.unlink(targetPath);
    res.json({ ok: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return res.status(404).json({ error: "File not found." });
    }
    logger.error(
      "Delete image failed (DELETE /api/product-descriptions/images)",
      { fileName, error: error.message, stack: error.stack }
    );
    res.status(500).json({ error: "Failed to delete image." });
  }
};

module.exports = {
  uploadProductImage,
  listProductImages,
  deleteProductImage,
};
