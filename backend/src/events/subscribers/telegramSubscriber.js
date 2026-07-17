const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const logger = require("@/utils/logger");
const { notifyOrderCreated, notifyFourDaysRemaining, notifyZeroDaysRemaining, notifyOrderRenewed } = require("@/domains/notifications/telegram/dispatchers/orderNotifier");

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

// Hàm này sẽ được gọi ở index.js để ghim các listener vào EventBus
function registerTelegramSubscribers() {
  eventBus.on(EVENTS.ORDER_CREATED, handleOrderCreated);
  eventBus.on(EVENTS.DAILY_FOUR_DAYS_DUE, handleFourDaysDue);
  eventBus.on(EVENTS.DAILY_ZERO_DAYS_DUE, handleZeroDaysDue);
  eventBus.on(EVENTS.ORDER_RENEWED, handleOrderRenewed);
  
  logger.info('[TelegramSubscriber] Đã đăng ký thành công');
}

module.exports = {
  registerTelegramSubscribers,
};
