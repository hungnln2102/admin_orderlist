const {
  listProductSupplierPricesByName,
  listProductSuppliersByName,
} = require("@/domains/products/services/productSupplierReadService");
const {
  createProductSupplierPrice,
  deleteProductSupplierPrice,
  updateProductSupplierPrice,
} = require("@/domains/products/services/productSupplierMutationService");
const logger = require("@/utils/logger");
const { writeUserEventLog } = require("@/domains/renew-adobe/services/systemEventLogService");

const getSuppliesByProductName = async (req, res) => {
  const { productName } = req.params;
  try {
    res.json(await listProductSuppliersByName(productName));
  } catch (error) {
    logger.error("Query failed (GET /api/products/supplies-by-name/:productName)", { productName, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải nhà cung cấp cho sản phẩm." });
  }
};

const getSupplyPricesByProductName = async (req, res) => {
  const { productName } = req.params;
  try {
    res.json(await listProductSupplierPricesByName(productName));
  } catch (error) {
    logger.error("Query failed (GET /api/products/all-prices-by-name/:productName)", { productName, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải giá nhà cung cấp cho sản phẩm." });
  }
};

const updateSupplyPriceForProduct = async (req, res) => {
  const { productId, sourceId } = req.params;
  const { price } = req.body || {};
  try {
    const result = await updateProductSupplierPrice({ productId, sourceId, price });
    res.json(result.response);
    writeUserEventLog(req, result.event);
  } catch (error) {
    logger.error("Update failed (PATCH /api/products/:productId/suppliers/:sourceId/price)", { productId, sourceId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể cập nhật giá nhà cung cấp." });
  }
};

const createSupplyPriceForProduct = async (req, res) => {
  const { productId } = req.params;
  const { sourceId, sourceName, price, numberBank, binBank } = req.body || {};
  try {
    const result = await createProductSupplierPrice({
      productId,
      sourceId,
      sourceName,
      price,
      numberBank,
      binBank,
    });
    if (result.badRequest) {
      return res.status(400).json({ error: result.badRequest });
    }
    writeUserEventLog(req, result.event);
    res.status(201).json(result.response);
  } catch (error) {
    logger.error("Insert failed (POST /api/product-prices/:productId/suppliers)", { productId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể thêm giá nhà cung cấp." });
  }
};

const deleteSupplyPriceForProduct = async (req, res) => {
  const { productId, sourceId } = req.params;
  try {
    const result = await deleteProductSupplierPrice({ productId, sourceId });
    if (result.badRequest) {
      return res.status(400).json({ error: result.badRequest });
    }
    writeUserEventLog(req, result.event);
    res.json(result.response);
  } catch (error) {
    logger.error("Delete failed (DELETE /api/products/:productId/suppliers/:sourceId)", { productId, sourceId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể xóa giá nhà cung cấp." });
  }
};

module.exports = {
  getSuppliesByProductName,
  getSupplyPricesByProductName,
  updateSupplyPriceForProduct,
  createSupplyPriceForProduct,
  deleteSupplyPriceForProduct,
};
