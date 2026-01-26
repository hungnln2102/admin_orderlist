const express = require("express");
const { sendOrderCreatedNotification, sendZeroDaysRemainingNotification } = require("../services/telegramOrderNotification");
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

/**
 * Test endpoint để gửi thông báo các đơn có số ngày còn lại = 0
 * GET /api/test-telegram/zero-days
 * POST /api/test-telegram/zero-days
 */
router.get("/zero-days", async (req, res) => {
  try {
    logger.info("[Test] Zero days notification test triggered (GET)");

    // Tạo dữ liệu test với các đơn có số ngày còn lại = 0
    const testOrders = [
      {
        id_order: "TEST-001",
        idOrder: "TEST-001",
        order_code: "TEST-001",
        orderCode: "TEST-001",
        customer: "Khách hàng Test 1",
        customer_name: "Khách hàng Test 1",
        id_product: "Sản phẩm Test A",
        idProduct: "Sản phẩm Test A",
        expiry_date_display: new Date().toLocaleDateString("vi-VN"),
        expiry_date_str: new Date().toLocaleDateString("vi-VN"),
        order_expired: new Date(),
      },
      {
        id_order: "TEST-002",
        idOrder: "TEST-002",
        order_code: "TEST-002",
        orderCode: "TEST-002",
        customer: "Khách hàng Test 2",
        customer_name: "Khách hàng Test 2",
        id_product: "Sản phẩm Test B",
        idProduct: "Sản phẩm Test B",
        expiry_date_display: new Date().toLocaleDateString("vi-VN"),
        expiry_date_str: new Date().toLocaleDateString("vi-VN"),
        order_expired: new Date(),
      },
      {
        id_order: "TEST-003",
        idOrder: "TEST-003",
        order_code: "TEST-003",
        orderCode: "TEST-003",
        customer: "Khách hàng Test 3",
        customer_name: "Khách hàng Test 3",
        id_product: "Sản phẩm Test C",
        idProduct: "Sản phẩm Test C",
        expiry_date_display: new Date().toLocaleDateString("vi-VN"),
        expiry_date_str: new Date().toLocaleDateString("vi-VN"),
        order_expired: new Date(),
      },
    ];

    await sendZeroDaysRemainingNotification(testOrders);

    res.json({
      success: true,
      message: "Test zero days notification sent. Check backend logs and Telegram for results.",
      testOrdersCount: testOrders.length,
      testOrders: testOrders.map(o => ({
        orderCode: o.id_order,
        customer: o.customer,
        product: o.id_product,
      })),
    });
  } catch (error) {
    logger.error("[Test] Zero days notification test failed (GET)", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: "Test zero days notification failed",
      message: error.message,
    });
  }
});

router.post("/zero-days", async (req, res) => {
  try {
    logger.info("[Test] Zero days notification test triggered (POST)");

    // Cho phép custom số lượng đơn test từ body
    const count = parseInt(req.body.count || "3", 10);
    const testOrders = [];

    for (let i = 1; i <= count; i++) {
      testOrders.push({
        id_order: `TEST-${String(i).padStart(3, "0")}`,
        idOrder: `TEST-${String(i).padStart(3, "0")}`,
        order_code: `TEST-${String(i).padStart(3, "0")}`,
        orderCode: `TEST-${String(i).padStart(3, "0")}`,
        customer: req.body.customer || `Khách hàng Test ${i}`,
        customer_name: req.body.customer || `Khách hàng Test ${i}`,
        id_product: req.body.product || `Sản phẩm Test ${String.fromCharCode(64 + i)}`,
        idProduct: req.body.product || `Sản phẩm Test ${String.fromCharCode(64 + i)}`,
        expiry_date_display: new Date().toLocaleDateString("vi-VN"),
        expiry_date_str: new Date().toLocaleDateString("vi-VN"),
        order_expired: new Date(),
      });
    }

    await sendZeroDaysRemainingNotification(testOrders);

    res.json({
      success: true,
      message: "Test zero days notification sent. Check backend logs and Telegram for results.",
      testOrdersCount: testOrders.length,
      testOrders: testOrders.map(o => ({
        orderCode: o.id_order,
        customer: o.customer,
        product: o.id_product,
      })),
    });
  } catch (error) {
    logger.error("[Test] Zero days notification test failed (POST)", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: "Test zero days notification failed",
      message: error.message,
      details: error.stack,
    });
  }
});

module.exports = router;
