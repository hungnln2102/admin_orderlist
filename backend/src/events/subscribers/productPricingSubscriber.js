const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const logger = require("@/utils/logger");
const { pricingCache, supplierCache } = require("@/utils/cache");
const { invalidate: invalidateTierCache } = require("@/services/pricing/tierCache");

function handleProductPriceChange(_payload) {
  try {
    logger.info("[ProductPricingSubscriber] Invalidating pricing and supplier cache due to product price change");
    pricingCache.clear();
    supplierCache.clear();
  } catch (error) {
    logger.error("[ProductPricingSubscriber] Error in handleProductPriceChange", { error: error.message });
  }
}

function handlePricingTierChange(_payload) {
  try {
    logger.info("[ProductPricingSubscriber] Invalidating tier cache due to pricing tier/margins change");
    invalidateTierCache();
  } catch (error) {
    logger.error("[ProductPricingSubscriber] Error in handlePricingTierChange", { error: error.message });
  }
}

function registerProductPricingSubscribers() {
  eventBus.on(EVENTS.PRODUCT_PRICE_CREATED, handleProductPriceChange);
  eventBus.on(EVENTS.PRODUCT_PRICE_UPDATED, handleProductPriceChange);
  eventBus.on(EVENTS.PRODUCT_PRICE_DELETED, handleProductPriceChange);

  eventBus.on(EVENTS.PRICING_TIER_CREATED, handlePricingTierChange);
  eventBus.on(EVENTS.PRICING_TIER_UPDATED, handlePricingTierChange);
  eventBus.on(EVENTS.VARIANT_MARGINS_UPDATED, handlePricingTierChange);

  logger.info("[ProductPricingSubscriber] Registered pricing cache invalidation listeners.");
}

module.exports = {
  registerProductPricingSubscribers,
};
