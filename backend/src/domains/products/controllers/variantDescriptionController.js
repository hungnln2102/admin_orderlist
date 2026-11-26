const { getEditorial, saveEditorial, takeEditorialAction } = require("../services/variantDescriptionEditorialService");
const { updateVariantDescription } = require("../services/productService");

function handler(operation) {
  return async (req, res) => {
    try {
      return res.json(await operation(req.params.id, req.body ?? {}, req.session.user));
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      console.error("[Products] Variant description operation failed", { name: error.name, code: error.code });
      return res.status(500).json({ error: "Không thể hoàn tất thao tác mô tả biến thể." });
    }
  };
}

module.exports = {
  getEditorial: handler((id, _body, actor) => getEditorial(id, actor)),
  saveEditorial: handler(saveEditorial),
  takeEditorialAction: handler(takeEditorialAction),
  updateVariantDescription: handler((id, { description }) => updateVariantDescription(id, description)),
};
