const {
  listPackageProducts,
  createPackageProduct,
  updatePackageProduct,
  deletePackageProduct,
  bulkDeletePackages,
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

const validateMatchRequiresAccount = (body) => {
  const matchMode = body?.matchMode ?? body?.match;
  if (matchMode !== "slot" && matchMode !== "information_order") return null;
  const informationUser = (body?.informationUser ?? body?.account_user ?? "").trim();
  if (!informationUser) {
    return "Khi chọn Match theo Slot hoặc Information, Thông tin gói (tài khoản/email) là bắt buộc.";
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
  const matchError = validateMatchRequiresAccount(body);
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
  const matchError = validateMatchRequiresAccount(body);
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

module.exports = {
  listPackageProducts: listHandler,
  createPackageProduct: createHandler,
  updatePackageProduct: updateHandler,
  deletePackageProduct: deleteHandler,
  bulkDeletePackages: bulkDeleteHandler,
};
