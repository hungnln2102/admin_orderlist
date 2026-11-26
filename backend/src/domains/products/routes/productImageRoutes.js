const express = require("express");
const multer = require("multer");
const controller = require("../controllers/productImageController");
const { MAX_IMAGE_BYTES } = require("../services/productImageService");

const router = express.Router();
const parseImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES + 1, files: 1, fields: 0, parts: 2 },
}).single("image");

function receiveImage(req, res, next) {
  parseImage(req, res, (error) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Dung lượng ảnh tối đa là 5 MiB." });
    }
    return res.status(400).json({ error: "Không thể đọc tệp ảnh tải lên." });
  });
}

router.get("/", controller.listImages);
router.post("/", receiveImage, controller.uploadImage);
router.put("/:key", receiveImage, controller.replaceImage);
router.delete("/:key", controller.deleteImage);

module.exports = router;
