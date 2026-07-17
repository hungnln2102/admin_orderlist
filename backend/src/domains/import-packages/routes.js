const express = require("express");
const {
  handleCreate,
  handleExpire,
  handleListRules,
  handleGetRule,
  handleUpsertRule,
  handleDeleteRule,
} = require("@/domains/import-packages/controller");

const router = express.Router();

// Orchestration: tao stock + package cung luc
router.post("/", handleCreate);

// Expire: xoa package (+ tuy chon xoa stock) khi het han
router.post("/:stockId/expire", handleExpire);

// Rules: cau hinh per-product (hien thi fields nao trong block nhap hang)
router.get("/rules", handleListRules);
router.get("/rules/:productId", handleGetRule);
router.put("/rules/:productId", handleUpsertRule);
router.delete("/rules/:productId", handleDeleteRule);

module.exports = router;
