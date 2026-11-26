const imageService = require("../services/productImageService");

function handler(operation, statusCode = 200) {
  return async (req, res) => {
    try {
      res.status(statusCode).json(await operation(req));
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      console.error("[Products] Media operation failed", { name: error.name, status: error.$metadata?.httpStatusCode });
      res.status(500).json({ error: "Không thể hoàn tất thao tác sản phẩm." });
    }
  };
}

module.exports = {
  listImages: handler(() => imageService.listImages()),
  uploadImage: handler((req) => imageService.uploadImage(req.file), 201),
  replaceImage: handler((req) => imageService.replaceImage(req.params.key, req.file)),
  deleteImage: handler((req) => imageService.deleteImage(req.params.key)),
};
