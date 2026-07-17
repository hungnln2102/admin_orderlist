const { ensureSupplierRecord } = require("@/domains/supplies/services/supplierLookupService");
const {
  deleteSupplierCostPrice,
  upsertSupplierCostPrice,
} = require("@/domains/supplies/services/supplierCostService");
const { updateOrderCostsOnSupplyPriceChange } = require("@/services/updateOrderCostsOnSupplyPriceChange");
const { pricingCache, supplierCache } = require("@/utils/cache");
const logger = require("@/utils/logger");
const { toNullableNumber } = require("@/utils/normalizers");

const normalizePositiveId = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const buildUpdateEvent = ({ result, ordersUpdated, debtAdjustment = 0, updateError = null }) => ({
  action: "Sửa giá NCC của sản phẩm",
  entity: "Bảng giá",
  entityId: result.productId,
  message: `Sửa giá NCC ${result.supplierId} của sản phẩm ${result.productId}`,
  source: "products.supply_prices",
  metadata: {
    productId: result.productId,
    supplierId: result.supplierId,
    price: result.price,
    ordersUpdated,
    ...(updateError ? { updateError } : { debtAdjustment }),
  },
});

const upsertProductSupplierPrice = async (identifiers, supplierId, price, trxOrDb = null) => {
  const idObj = typeof identifiers === "object" ? identifiers || {} : { productId: identifiers };
  const variantId = Number.isFinite(Number(idObj.variantId))
    ? Number(idObj.variantId)
    : Number.isFinite(Number(idObj.productId))
    ? Number(idObj.productId)
    : null;
  const parsedSupplierId = Number(supplierId);
  const normalizedPrice = toNullableNumber(price);

  if (!Number.isFinite(variantId) || !Number.isFinite(parsedSupplierId)) {
    throw new Error("Invalid product or source id.");
  }

  const result = await upsertSupplierCostPrice(
    { variantId, supplierId: parsedSupplierId, price: normalizedPrice },
    trxOrDb
  );

  return {
    id: result.id,
    productId: result.variantId,
    supplierId: result.supplierId,
    price: result.price,
  };
};

const updateProductSupplierPrice = async ({ productId, sourceId, price }) => {
  const result = await upsertProductSupplierPrice({ productId }, sourceId, price);
  pricingCache.clear();

  try {
    const updateResult = await updateOrderCostsOnSupplyPriceChange(
      Number(productId),
      Number(sourceId),
      price
    );

    return {
      response: {
        productId: result.productId,
        sourceId: result.supplierId,
        supplierId: result.supplierId,
        price: result.price,
        ordersUpdated: updateResult.updatedCount,
        debtAdjustment: updateResult.debtAdjustment || 0,
      },
      event: buildUpdateEvent({
        result,
        ordersUpdated: updateResult.updatedCount,
        debtAdjustment: updateResult.debtAdjustment || 0,
      }),
    };
  } catch (updateError) {
    logger.error("Failed to auto-update order costs", {
      productId,
      sourceId,
      error: updateError?.message,
      stack: updateError?.stack,
    });

    return {
      response: {
        productId: result.productId,
        sourceId: result.supplierId,
        supplierId: result.supplierId,
        price: result.price,
        ordersUpdated: 0,
        updateError: "Failed to update orders",
      },
      event: buildUpdateEvent({
        result,
        ordersUpdated: 0,
        updateError: "Failed to update orders",
      }),
    };
  }
};

const createProductSupplierPrice = async ({ productId, sourceId, sourceName, price, numberBank, binBank }) => {
  const parsedProductId = normalizePositiveId(productId);
  if (!parsedProductId) {
    return { badRequest: "ID sản phẩm không hợp lệ." };
  }

  const parsedSourceId = normalizePositiveId(sourceId);
  const resolvedSourceId = parsedSourceId || await ensureSupplierRecord(sourceName, numberBank, binBank);
  if (!normalizePositiveId(resolvedSourceId)) {
    return { badRequest: "Nhà cung cấp bị thiếu hoặc không hợp lệ." };
  }

  const result = await upsertProductSupplierPrice({ productId: parsedProductId }, resolvedSourceId, price);
  pricingCache.clear();
  supplierCache.clear();

  return {
    response: {
      productId: result.productId,
      sourceId: result.supplierId,
      supplierId: result.supplierId,
      price: result.price,
    },
    event: {
      action: "Thêm giá NCC cho sản phẩm",
      entity: "Bảng giá",
      entityId: result.productId,
      message: `Thêm giá NCC ${result.supplierId} cho sản phẩm ${result.productId}`,
      source: "products.supply_prices",
      metadata: {
        productId: result.productId,
        supplierId: result.supplierId,
        sourceName: sourceName || null,
        price: result.price,
      },
    },
  };
};

const deleteProductSupplierPrice = async ({ productId, sourceId }) => {
  const parsedProductId = normalizePositiveId(productId);
  const parsedSourceId = normalizePositiveId(sourceId);
  if (!parsedProductId || !parsedSourceId) {
    return { badRequest: "ID sản phẩm hoặc ID nhà cung cấp không hợp lệ." };
  }

  await deleteSupplierCostPrice({
    variantId: parsedProductId,
    supplierId: parsedSourceId,
  });
  pricingCache.clear();

  return {
    response: { success: true },
    event: {
      action: "Xóa giá NCC của sản phẩm",
      entity: "Bảng giá",
      entityId: parsedProductId,
      message: `Xóa giá NCC ${parsedSourceId} của sản phẩm ${parsedProductId}`,
      source: "products.supply_prices",
      metadata: {
        productId: parsedProductId,
        supplierId: parsedSourceId,
      },
    },
  };
};

module.exports = {
  createProductSupplierPrice,
  deleteProductSupplierPrice,
  updateProductSupplierPrice,
  upsertProductSupplierPrice,
};
