const express = require("express");
const { sendOrderCreatedNotification } = require("../services/telegramOrderNotification");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * Test endpoint to manually trigger a Telegram notification
 * POST /api/test-telegram
 */
router.post("/", async (req, res) => {
  try {
    logger.info("[Test] Telegram notification test triggered");

    // Create a test order object
    const testOrder = {
      id: 99999,
      id_order: "TEST-ORDER-" + Date.now(),
      idOrder: "TEST-ORDER-" + Date.now(),
      order_code: "TEST-ORDER-" + Date.now(),
      id_product: req.body.product || "Test Product",
      idProduct: req.body.product || "Test Product",
      information_order: req.body.info || "Test order information",
      informationOrder: req.body.info || "Test order information",
      customer: req.body.customer || "Test Customer",
      customer_name: req.body.customer || "Test Customer",
      registration_date_display: new Date().toLocaleDateString("vi-VN"),
      registration_date_str: new Date().toLocaleDateString("vi-VN"),
      order_date: new Date(),
      expiry_date_display: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN"),
      expiry_date_str: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN"),
      order_expired: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      days: req.body.days || 30,
      total_days: req.body.days || 30,
      price: req.body.price || 100000,
    };

    logger.info("[Test] Test order created", { testOrder });

    // Send notification
    await sendOrderCreatedNotification(testOrder);

    logger.info("[Test] Notification function completed");

    res.json({
      success: true,
      message: "Test notification sent. Check backend logs and Telegram for results.",
      testOrder: {
        id: testOrder.id,
        orderCode: testOrder.id_order,
        product: testOrder.id_product,
        customer: testOrder.customer,
        price: testOrder.price,
      },
    });
  } catch (error) {
    logger.error("[Test] Test notification failed", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: "Test notification failed",
      message: error.message,
      details: error.stack,
    });
  }
});

/**
 * GET endpoint for simple browser testing
 * GET /api/test-telegram
 */
router.get("/", async (req, res) => {
  try {
    logger.info("[Test] Telegram notification test triggered (GET)");

    const testOrder = {
      id: 99999,
      id_order: "TEST-GET-" + Date.now(),
      id_product: "Test Product (GET)",
      information_order: "Test order via GET request",
      customer: "Test Customer (GET)",
      registration_date_display: new Date().toLocaleDateString("vi-VN"),
      order_date: new Date(),
      expiry_date_display: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN"),
      order_expired: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      days: 30,
      price: 100000,
    };

    await sendOrderCreatedNotification(testOrder);

    res.json({
      success: true,
      message: "Test notification sent via GET. Check backend logs and Telegram for results.",
      testOrder: {
        id: testOrder.id,
        orderCode: testOrder.id_order,
      },
    });
  } catch (error) {
    logger.error("[Test] Test notification failed (GET)", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: "Test notification failed",
      message: error.message,
    });
  }
});

module.exports = router;
