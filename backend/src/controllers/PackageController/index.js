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
    res.status(500).json({ error: "Unable to load package products." });
  }
};

const createHandler = async (req, res) => {
  const { packageName } = req.body || {};
  if (!packageName || typeof packageName !== "string" || !packageName.trim()) {
    return res.status(400).json({ error: "Package name is required." });
  }

  try {
    const newRow = await createPackageProduct(req.body || {});
    res.status(201).json(newRow);
  } catch (error) {
    console.error("[packages] Insert failed:", error);
    res.status(500).json({ error: "Unable to create package product." });
  }
};

const updateHandler = async (req, res) => {
  const { id } = req.params;
  const { packageName } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: "Package product ID is required." });
  }
  if (!packageName || typeof packageName !== "string" || !packageName.trim()) {
    return res.status(400).json({ error: "Package name is required." });
  }

  try {
    const updated = await updatePackageProduct(id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: "Package product not found." });
    }
    res.json(updated);
  } catch (error) {
    console.error(`[packages] Update failed for id=${id}:`, error);
    res.status(500).json({ error: "Unable to update package product." });
  }
};

const deleteHandler = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Package product ID is required." });
  }

  try {
    const deletedRows = await deletePackageProduct(id);
    if (!deletedRows || deletedRows.length === 0) {
      return res.status(404).json({ error: "Package product not found." });
    }

    res.json({
      deleted: deletedRows.length,
      deletedIds: deletedRows.map((row) => row[pkgCols.id]).filter(Boolean),
      deletedNames: [],
    });
  } catch (error) {
    console.error(`[packages] Delete failed for id=${id}:`, error);
    res.status(500).json({ error: "Unable to delete package product." });
  }
};

const bulkDeleteHandler = async (req, res) => {
  const { packages } = req.body || {};
  if (!Array.isArray(packages)) {
    return res.status(400).json({ error: "Packages must be an array." });
  }
  const names = Array.from(
    new Set(
      packages
        .map((name) => (typeof name === "string" ? name.trim() : ""))
        .filter(Boolean)
    )
  );
  if (!names.length) {
    return res.status(400).json({ error: "No package names provided." });
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
    res.status(500).json({ error: "Unable to delete package products." });
  }
};

module.exports = {
  listPackageProducts: listHandler,
  createPackageProduct: createHandler,
  updatePackageProduct: updateHandler,
  deletePackageProduct: deleteHandler,
  bulkDeletePackages: bulkDeleteHandler,
};
