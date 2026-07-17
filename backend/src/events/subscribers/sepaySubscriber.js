const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const logger = require("@/utils/logger");
const { processWebhookTransactionAsync } = require('../../../webhook/sepay/routes/webhook/postHandler');

async function handleSepayWebhookReceived(payload) {
  try {
    const { reqBody, parsed } = payload;
    logger.info('[SepaySubscriber] Bắt đầu xử lý webhook Sepay thông qua EventBus', { 
      transactionId: parsed?.transaction?.id 
    });
    
    await processWebhookTransactionAsync(reqBody, parsed);
    
    logger.info('[SepaySubscriber] Đã xử lý xong webhook Sepay', {
      transactionId: parsed?.transaction?.id
    });
  } catch (error) {
    logger.error('[SepaySubscriber] Lỗi khi xử lý SEPAY_WEBHOOK_RECEIVED', { 
      error: error.message, 
      stack: error.stack 
    });
  }
}

function registerSepaySubscribers() {
  eventBus.on(EVENTS.SEPAY_WEBHOOK_RECEIVED, handleSepayWebhookReceived);
  logger.info('[SepaySubscriber] Đã đăng ký thành công');
}

module.exports = {
  registerSepaySubscribers,
};
