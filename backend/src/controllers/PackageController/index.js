const {
  listPackageProducts,
  createPackageProduct,
  updatePackageProduct,
  deletePackageProduct,
  bulkDeletePackages,
  updateProductPackageOptions,
  fetchProductRequiresActivationForPackagePayload,
} = require("./service");
const { pkgCols } = require("./constants");
const logger = require("../../utils/logger");

const listHandler = async (_req, res) => {
  try {
    const rows = await listPackageProducts();
    res.json(rows);
  } catch (error) {
    logger.error("[packages] Query failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải sản phẩm đang gói." });
  }
};

const validateMatchRequiresAccount = (body, productRequiresActivation) => {
  const matchMode = body?.matchMode ?? body?.match;
  if (matchMode !== "slot" && matchMode !== "information_order") return null;
  const hasStock = body?.stockId != null && body?.stockId !== "";
  if (!hasStock) {
    return "Cần chọn tài khoản gốc (stock_id) khi bật ghép đơn.";
  }
  if (matchMode === "information_order" && productRequiresActivation) {
    const hasStorage = body?.storageId != null && body?.storageId !== "";
    if (!hasStorage) {
      return "Chế độ theo thông tin đơn cần tài khoản kích hoạt (storage_id).";
    }
  }
  return null;
};

const createHandler = async (req, res) => {
  const body = req.body || {};
  const packageId = body.packageId ?? body.package_id;
  const idNum = packageId != null ? Number(packageId) : NaN;
  if (!Number.isFinite(idNum) || idNum < 1) {
    return res.status(400).json({ error: "Loại gói (product id) là bắt buộc." });
  }
  let requiresActivation = false;
  try {
    requiresActivation = await fetchProductRequiresActivationForPackagePayload(body);
  } catch (err) {
    logger.warn("[packages] Không đọc được package_requires_activation, giữ validation storage", {
      error: err?.message,
    });
    requiresActivation = true;
  }
  const matchError = validateMatchRequiresAccount(body, requiresActivation);
  if (matchError) {
    return res.status(400).json({ error: matchError });
  }

  try {
    const newRow = await createPackageProduct(req.body || {});
    res.status(201).json(newRow);
  } catch (error) {
    logger.error("[packages] Insert failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tạo sản phẩm đang gói." });
  }
};

const updateHandler = async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  if (!id) {
    return res.status(400).json({ error: "ID sản phẩm gói hàng là bắt buộc." });
  }
  let requiresActivation = false;
  try {
    requiresActivation = await fetchProductRequiresActivationForPackagePayload(body, {
      packageProductRowId: id,
    });
  } catch (err) {
    logger.warn("[packages] Không đọc được package_requires_activation (update), giữ validation storage", {
      error: err?.message,
    });
    requiresActivation = true;
  }
  const matchError = validateMatchRequiresAccount(body, requiresActivation);
  if (matchError) {
    return res.status(400).json({ error: matchError });
  }

  try {
    const updated = await updatePackageProduct(id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm gói hàng." });
    }
    res.json(updated);
  } catch (error) {
    logger.error("[packages] Update failed", { id, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể cập nhật sản phẩm gói hàng." });
  }
};

const deleteHandler = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "ID sản phẩm gói hàng là bắt buộc." });
  }

  try {
    const deletedRows = await deletePackageProduct(id);
    if (!deletedRows || deletedRows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm gói hàng." });
    }

    res.json({
      deleted: deletedRows.length,
      deletedIds: deletedRows.map((row) => row[pkgCols.id]).filter(Boolean),
      deletedNames: [],
    });
  } catch (error) {
    logger.error("[packages] Delete failed", { id, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể xóa sản phẩm gói hàng." });
  }
};

const bulkDeleteHandler = async (req, res) => {
  const { packageIds, packages } = req.body || {};
  const ids = Array.isArray(packageIds)
    ? packageIds
    : Array.isArray(packages)
      ? packages.map((x) => (typeof x === "number" ? x : Number(x))).filter(Number.isFinite)
      : [];
  const uniqueIds = [...new Set(ids)].filter((id) => id >= 1);
  if (!uniqueIds.length) {
    return res.status(400).json({ error: "Cần ít nhất một package_id (product id) để xóa." });
  }

  try {
    const deleteResult = await bulkDeletePackages(uniqueIds);
    res.json({
      deleted: deleteResult.length,
      deletedIds: uniqueIds,
    });
  } catch (error) {
    logger.error("[packages] Bulk delete failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể xóa sản phẩm đang gói." });
  }
};

const patchProductOptionsHandler = async (req, res) => {
  const productId = req.params.productId ?? req.params.packageId;
  try {
    const result = await updateProductPackageOptions(productId, req.body || {});
    if (!result) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm (product)." });
    }
    res.json(result);
  } catch (error) {
    logger.error("[packages] Cập nhật tuỳ chọn product thất bại", {
      productId,
      error: error.message,
      stack: error.stack,
    });
    res.status(400).json({
      error: error instanceof Error ? error.message : "Không thể cập nhật.",
    });
  }
};

module.exports = {
  listPackageProducts: listHandler,
  createPackageProduct: createHandler,
  updatePackageProduct: updateHandler,
  deletePackageProduct: deleteHandler,
  bulkDeletePackages: bulkDeleteHandler,
  patchProductPackageOptions: patchProductOptionsHandler,
};
