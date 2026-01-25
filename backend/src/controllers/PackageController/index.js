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

const createHandler = async (req, res) => {
  const { packageName } = req.body || {};
  if (!packageName || typeof packageName !== "string" || !packageName.trim()) {
    return res.status(400).json({ error: "Tên gói hàng là bắt buộc." });
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
  const { packageName } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: "ID sản phẩm gói hàng là bắt buộc." });
  }
  if (!packageName || typeof packageName !== "string" || !packageName.trim()) {
    return res.status(400).json({ error: "Tên gói hàng là bắt buộc." });
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
  const { packages } = req.body || {};
  if (!Array.isArray(packages)) {
    return res.status(400).json({ error: "Các gói hàng phải là một mảng." });
  }
  const names = Array.from(
    new Set(
      packages
        .map((name) => (typeof name === "string" ? name.trim() : ""))
        .filter(Boolean)
    )
  );
  if (!names.length) {
    return res.status(400).json({ error: "Không có tên gói nào được cung cấp." });
  }

  try {
    const deleteResult = await bulkDeletePackages(names);
    const deletedNames = deleteResult
      .map((row) => row[pkgCols.package] || row.package || row.package_name)
      .filter(Boolean);
    res.json({
      deleted: deleteResult.length,
      deletedNames,
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
