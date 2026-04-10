const express = require("express");
const router = express.Router();

const categories = require("./handlers/categories");
const articles = require("./handlers/articles");
const banners = require("./handlers/banners");
const {
  contentIdParam,
  createArticleRules,
  updateArticleRules,
  createBannerRules,
  reorderBannerRules,
  createContentCategoryRules,
  updateContentCategoryRules,
} = require("../../validators/contentValidator");

router.get("/categories", categories.list);
router.post("/categories", ...createContentCategoryRules, categories.create);
router.patch("/categories/:id", ...updateContentCategoryRules, categories.update);
router.delete("/categories/:id", ...contentIdParam, categories.remove);

router.get("/articles", articles.list);
router.get("/articles/:id", ...contentIdParam, articles.getById);
router.post("/articles", ...createArticleRules, articles.create);
router.patch("/articles/:id", ...updateArticleRules, articles.update);
router.delete("/articles/:id", ...contentIdParam, articles.remove);

router.get("/banners", banners.list);
router.post("/banners", ...createBannerRules, banners.create);
router.patch("/banners/:id", ...contentIdParam, banners.update);
router.patch("/banners/:id/toggle", ...contentIdParam, banners.toggle);
router.post("/banners/reorder", ...reorderBannerRules, banners.reorder);
router.delete("/banners/:id", ...contentIdParam, banners.remove);

module.exports = router;
