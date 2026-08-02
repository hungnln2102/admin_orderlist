const express = require("express");
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("@/domains/products/categories/controller");
const { categoryIdParam, createCategoryRules } = require("@/domains/products/categories/validators/categoryValidator");

const router = express.Router();

router.get("/", listCategories);
router.post("/", ...createCategoryRules, createCategory);
router.put("/:id", ...categoryIdParam, updateCategory);
router.delete("/:id", ...categoryIdParam, deleteCategory);

module.exports = router;
