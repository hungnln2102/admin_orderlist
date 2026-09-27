const productService = require("../services/productService");

const getProductPrices = async (req, res) => {
  try {
    const { page, limit, search, activeOnly } = req.query;
    const isActiveOnly = activeOnly === "true" || activeOnly === "1";
    const result = await productService.getProductPrices({ page, limit, search, activeOnly: isActiveOnly });
    res.json(result);
  } catch (error) {
    console.error("Lỗi getProductPrices:", error);
    res.status(500).json({ error: "Không thể lấy danh sách bảng giá sản phẩm" });
  }
};

const getPackageProducts = async (_req, res) => {
  try {
    const data = await productService.getPackageProducts();
    res.json({ data });
  } catch (error) {
    console.error("Lỗi getPackageProducts:", error);
    res.status(500).json({ error: "Không thể lấy danh sách kho gói sản phẩm" });
  }
};


const getSuppliersForVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await productService.getSuppliersForVariant(productId);
    res.json({ data: result });
  } catch (error) {
    console.error("Lỗi getSuppliersForVariant:", error);
    res.status(500).json({ error: "Không thể lấy danh sách NCC của sản phẩm" });
  }
};

const getAllSuppliersList = async (_req, res) => {
  try {
    const result = await productService.getAllSuppliersList();
    res.json({ data: result });
  } catch (error) {
    console.error("Lỗi getAllSuppliersList:", error);
    res.status(500).json({ error: "Không thể lấy danh sách Nhà cung cấp" });
  }
};

const createProduct = async (req, res) => {
  try {
    const result = await productService.createProduct(req.body);
    res.status(201).json({ message: "Tạo sản phẩm thành công", data: result });
  } catch (error) {
    console.error("Lỗi createProduct:", error);
    res.status(500).json({ error: error.message || "Tạo sản phẩm thất bại" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await productService.updateProduct(productId, req.body);
    res.json({ message: "Cập nhật sản phẩm thành công", data: result });
  } catch (error) {
    console.error("Lỗi updateProduct:", error);
    res.status(500).json({ error: error.message || "Cập nhật sản phẩm thất bại" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await productService.deleteProduct(productId);
    res.json({ message: "Xóa sản phẩm thành công", data: result });
  } catch (error) {
    console.error("Lỗi deleteProduct:", error);
    res.status(500).json({ error: error.message || "Xóa sản phẩm thất bại" });
  }
};

const addSupplierCost = async (req, res) => {
  try {
    const { productId } = req.params;
    const { supplier_id, price } = req.body;
    const result = await productService.addSupplierCost(productId, supplier_id, price);
    res.status(201).json({ message: "Thêm nguồn NCC thành công", data: result });
  } catch (error) {
    console.error("Lỗi addSupplierCost:", error);
    res.status(500).json({ error: error.message || "Thêm nguồn NCC thất bại" });
  }
};

const updateSupplierCost = async (req, res) => {
  try {
    const { supplierCostId } = req.params;
    const { price } = req.body;
    const result = await productService.updateSupplierCost(supplierCostId, price);
    res.json({ message: "Cập nhật giá nguồn NCC thành công", data: result });
  } catch (error) {
    console.error("Lỗi updateSupplierCost:", error);
    res.status(500).json({ error: error.message || "Cập nhật giá nguồn NCC thất bại" });
  }
};

const deleteSupplierCost = async (req, res) => {
  try {
    const { supplierCostId } = req.params;
    const result = await productService.deleteSupplierCost(supplierCostId);
    res.json({ message: "Xóa nguồn NCC thành công", data: result });
  } catch (error) {
    console.error("Lỗi deleteSupplierCost:", error);
    res.status(500).json({ error: error.message || "Xóa nguồn NCC thất bại" });
  }
};

module.exports = {
  getProductPrices,
  getPackageProducts,
  getSuppliersForVariant,
  getAllSuppliersList,
  createProduct,
  updateProduct,
  deleteProduct,
  addSupplierCost,
  updateSupplierCost,
  deleteSupplierCost,
};
