const {
  listPackageProducts,
  createPackageProduct,
  updatePackageProduct,
  deletePackageProduct,
  bulkDeletePackages,
} = require("./service");
const { pkgCols } = require("./constants");

const listHandler = async (_req, res) => {
  try {
    const rows = await listPackageProducts();
    res.json(rows);
  } catch (error) {
    console.error("[packages] Query failed:", error);
    res.status(500).json({ error: "Khong the tai san pham dang goi." });
  }
};

const createHandler = async (req, res) => {
  const { packageName } = req.body || {};
  if (!packageName || typeof packageName !== "string" || !packageName.trim()) {
    return res.status(400).json({ error: "Ten goi hang la bat buoc." });
  }

  try {
    const newRow = await createPackageProduct(req.body || {});
    res.status(201).json(newRow);
  } catch (error) {
    console.error("[packages] Insert failed:", error);
    res.status(500).json({ error: "Khong the tao san pham dang goi." });
  }
};

const updateHandler = async (req, res) => {
  const { id } = req.params;
  const { packageName } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: "ID san pham goi hang la bat buoc." });
  }
  if (!packageName || typeof packageName !== "string" || !packageName.trim()) {
    return res.status(400).json({ error: "Ten goi hang la bat buoc." });
  }

  try {
    const updated = await updatePackageProduct(id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: "Khong tim thay san pham goi hang." });
    }
    res.json(updated);
  } catch (error) {
    console.error(`[packages] Update failed for id=${id}:`, error);
    res.status(500).json({ error: "Khong the cap nhat san pham goi hang." });
  }
};

const deleteHandler = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "ID san pham goi hang la bat buoc." });
  }

  try {
    const deletedRows = await deletePackageProduct(id);
    if (!deletedRows || deletedRows.length === 0) {
      return res.status(404).json({ error: "Khong tim thay san pham goi hang." });
    }

    res.json({
      deleted: deletedRows.length,
      deletedIds: deletedRows.map((row) => row[pkgCols.id]).filter(Boolean),
      deletedNames: [],
    });
  } catch (error) {
    console.error(`[packages] Delete failed for id=${id}:`, error);
    res.status(500).json({ error: "Khong the xoa san pham goi hang." });
  }
};

const bulkDeleteHandler = async (req, res) => {
  const { packages } = req.body || {};
  if (!Array.isArray(packages)) {
    return res.status(400).json({ error: "Cac goi hang phai la mot mang." });
  }
  const names = Array.from(
    new Set(
      packages
        .map((name) => (typeof name === "string" ? name.trim() : ""))
        .filter(Boolean)
    )
  );
  if (!names.length) {
    return res.status(400).json({ error: "Khong co ten goi nao duoc cung cap." });
  }

  try {
    const deleteResult = await bulkDeletePackages(names);
    const deletedNames = deleteResult.map((row) => row.package).filter(Boolean);
    res.json({
      deleted: deleteResult.length,
      deletedNames,
    });
  } catch (error) {
    console.error("[packages] Delete failed:", error);
    res.status(500).json({ error: "Khong the xoa san pham dang goi." });
  }
};

module.exports = {
  listPackageProducts: listHandler,
  createPackageProduct: createHandler,
  updatePackageProduct: updateHandler,
  deletePackageProduct: deleteHandler,
  bulkDeletePackages: bulkDeleteHandler,
};
