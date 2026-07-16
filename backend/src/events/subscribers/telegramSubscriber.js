const eventBus = require('../eventBus');
const EVENTS = require('../eventTypes');
const logger = require('../../utils/logger');
const { notifyOrderCreated, notifyFourDaysRemaining, notifyZeroDaysRemaining, notifyOrderRenewed } = require('../../domains/notifications/telegram/dispatchers/orderNotifier');
const { notifySepayReceived, notifySepaySpent } = require('../../domains/notifications/telegram/dispatchers/financeNotifier');

/**
 * Lắng nghe các sự kiện và bắn Telegram
 */
function handleOrderCreated(orderData) {
  try {
    logger.info(`[TelegramSubscriber] Nhận sự kiện ORDER_CREATED cho đơn: ${orderData?.id_order || 'N/A'}`);
    notifyOrderCreated(orderData);
  } catch (error) {
    logger.error('[TelegramSubscriber] Lỗi khi xử lý ORDER_CREATED', { error: error.message });
  }
}

function handleFourDaysDue(orders) {
  try {
    logger.info(`[TelegramSubscriber] Nhận sự kiện DAILY_FOUR_DAYS_DUE cho ${orders.length} đơn`);
    notifyFourDaysRemaining(orders);
  } catch (error) {
    logger.error('[TelegramSubscriber] Lỗi khi xử lý DAILY_FOUR_DAYS_DUE', { error: error.message });
  }
}

function handleZeroDaysDue(orders) {
  try {
    logger.info(`[TelegramSubscriber] Nhận sự kiện DAILY_ZERO_DAYS_DUE cho ${orders.length} đơn`);
    notifyZeroDaysRemaining(orders);
  } catch (error) {
    logger.error('[TelegramSubscriber] Lỗi khi xử lý DAILY_ZERO_DAYS_DUE', { error: error.message });
  }
}

function handleOrderRenewed(order) {
  try {
    logger.info(`[TelegramSubscriber] Nhận sự kiện ORDER_RENEWED cho đơn: ${order?.id_order || 'N/A'}`);
    notifyOrderRenewed(order);
  } catch (error) {
    logger.error('[TelegramSubscriber] Lỗi khi xử lý ORDER_RENEWED', { error: error.message });
  }
}

function handleSepayMoneyIn(payload) {
  try {
    const { orderCode, amount } = payload;
    logger.info(`[TelegramSubscriber] Nhận sự kiện SEPAY_MONEY_IN cho đơn: ${orderCode || 'N/A'}`);
    notifySepayReceived(orderCode, amount);
  } catch (error) {
    logger.error('[TelegramSubscriber] Lỗi khi xử lý SEPAY_MONEY_IN', { error: error.message });
  }
}

function handleSepayMoneyOut(payload) {
  try {
    const { orderCode, amount } = payload;
    logger.info(`[TelegramSubscriber] Nhận sự kiện SEPAY_MONEY_OUT cho đơn: ${orderCode || 'N/A'}`);
    notifySepaySpent(orderCode, amount);
  } catch (error) {
    logger.error('[TelegramSubscriber] Lỗi khi xử lý SEPAY_MONEY_OUT', { error: error.message });
  }
}

// Hàm này sẽ được gọi ở index.js để ghim các listener vào EventBus
function registerTelegramSubscribers() {
  eventBus.on(EVENTS.ORDER_CREATED, handleOrderCreated);
  eventBus.on(EVENTS.DAILY_FOUR_DAYS_DUE, handleFourDaysDue);
  eventBus.on(EVENTS.DAILY_ZERO_DAYS_DUE, handleZeroDaysDue);
  eventBus.on(EVENTS.ORDER_RENEWED, handleOrderRenewed);
  eventBus.on(EVENTS.SEPAY_MONEY_IN, handleSepayMoneyIn);
  eventBus.on(EVENTS.SEPAY_MONEY_OUT, handleSepayMoneyOut);
  
  logger.info('[TelegramSubscriber] Đã đăng ký thành công');
}

module.exports = {
  registerTelegramSubscribers,
};
