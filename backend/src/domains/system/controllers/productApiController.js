const productApiService = require("../services/productApiService");
const { getClientErrorMessage } = require("@/utils/clientError");

async function list(req, res) {
  try {
    const data = await productApiService.listProductApis();
    res.json({ success: true, ...data });
  } catch (error) {
    console.error("[ProductApi Controller] Lỗi listProductApis:", error);
    res.status(500).json({ success: false, error: getClientErrorMessage(error, "Không thể tải danh sách cấu hình API sản phẩm.") });
  }
}

async function assign(req, res) {
  try {
    const result = await productApiService.assignApiToProduct(req.body || {});
    res.status(201).json(result);
  } catch (error) {
    console.error("[ProductApi Controller] Lỗi assignApiToProduct:", error);
    res.status(400).json({ success: false, error: getClientErrorMessage(error, "Không thể gán API cho sản phẩm.") });
  }
}

async function update(req, res) {
  try {
    const result = await productApiService.updateMapping(Number(req.params.id), req.body || {});
    res.json(result);
  } catch (error) {
    console.error(`[ProductApi Controller] Lỗi updateMapping #${req.params.id}:`, error);
    res.status(400).json({ success: false, error: getClientErrorMessage(error, "Không thể cập nhật cấu hình mapping.") });
  }
}

async function setDefault(req, res) {
  try {
    const result = await productApiService.setDefaultApi(Number(req.params.id));
    res.json(result);
  } catch (error) {
    console.error(`[ProductApi Controller] Lỗi setDefaultApi #${req.params.id}:`, error);
    res.status(400).json({ success: false, error: getClientErrorMessage(error, "Không thể đặt API làm mặc định.") });
  }
}

async function remove(req, res) {
  try {
    const result = await productApiService.removeApiFromProduct(Number(req.params.id));
    res.json(result);
  } catch (error) {
    console.error(`[ProductApi Controller] Lỗi removeApiFromProduct #${req.params.id}:`, error);
    res.status(400).json({ success: false, error: getClientErrorMessage(error, "Không thể gỡ bỏ API khỏi sản phẩm.") });
  }
}

async function getMapping(req, res) {
  try {
    const mapping = await productApiService.getApisByProductMapping();
    res.json({ success: true, ...mapping });
  } catch (error) {
    console.error("[ProductApi Controller] Lỗi getApisByProductMapping:", error);
    res.status(500).json({ success: false, error: getClientErrorMessage(error, "Không thể tải cấu hình mapping API.") });
  }
}

module.exports = {
  list,
  assign,
  update,
  setDefault,
  remove,
  getMapping,
};

