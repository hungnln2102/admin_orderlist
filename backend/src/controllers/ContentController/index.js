const express = require("express");
const router = express.Router();

const categories = require("./handlers/categories");
const articles = require("./handlers/articles");
const banners = require("./handlers/banners");

// --- Article Categories ---
router.get("/categories", categories.list);
router.post("/categories", categories.create);
router.patch("/categories/:id", categories.update);
router.delete("/categories/:id", categories.remove);

// --- Articles ---
router.get("/articles", articles.list);
router.get("/articles/:id", articles.getById);
router.post("/articles", articles.create);
router.patch("/articles/:id", articles.update);
router.delete("/articles/:id", articles.remove);

// --- Banners ---
router.get("/banners", banners.list);
router.post("/banners", banners.create);
router.patch("/banners/:id", banners.update);
router.patch("/banners/:id/toggle", banners.toggle);
router.post("/banners/reorder", banners.reorder);
router.delete("/banners/:id", banners.remove);

module.exports = router;
