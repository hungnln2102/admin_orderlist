const logger = require("../../utils/logger");
const {
  PricingHttpError,
  calculateOrderPricing,
} = require("../../services/pricing/orderPricingService");

const attachCalculatePriceRoute = (router) => {
  router.post("/calculate-price", async (req, res) => {
    logger.debug("[POST] /api/calculate-price");

    const {
      supply_id,
      san_pham_name,
      id_product,
      id_order,
      customer_type,
      variant_id,
    } = req.body || {};

    const hasVariantId =
      variant_id != null &&
      Number.isFinite(Number(variant_id)) &&
      Number(variant_id) > 0;
    const productKey = hasVariantId
      ? String(Number(variant_id))
      : String(san_pham_name || id_product || "").trim();
    const orderId = String(id_order || "").trim();

    try {
      const pricingResult = await calculateOrderPricing({
        supplyId: supply_id,
        productKey,
        orderId,
        customerType: customer_type,
      });
      res.json(pricingResult);
    } catch (error) {
      if (error instanceof PricingHttpError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      logger.error("Calculation error", {
        orderId,
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: "System Error" });
    }
  });
};

module.exports = { attachCalculatePriceRoute };
