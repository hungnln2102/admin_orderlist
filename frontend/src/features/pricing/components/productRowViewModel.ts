import type { ProductPricingRow } from "../types";
import {
  computeHighestSupplyPrice,
  formatCurrencyValue,
  formatDateLabel,
  formatProfitPercentBySale,
  parseRatioInput,
  pickCheapestSupplier,
} from "../utils";
import type { ProductRowEditControls, ProductRowSupplyState } from "./productRowContracts";

export const buildProductRowViewModel = ({
  item,
  supplyState,
  statusOverride,
  updatedTimestamp,
  editControls,
}: {
  item: ProductPricingRow;
  supplyState: ProductRowSupplyState["supplyState"];
  statusOverride?: boolean;
  updatedTimestamp?: string;
  editControls: ProductRowEditControls;
}) => {
  const supplierItems = supplyState?.items ?? [];
  const cheapestSupplier = pickCheapestSupplier(supplierItems);
  const cheapestPrice = cheapestSupplier?.price ?? item.baseSupplyPrice;
  const cheapestSupplierName = cheapestSupplier?.sourceName ?? "-";
  const highestSupplyPrice = computeHighestSupplyPrice(
    supplierItems,
    item.baseSupplyPrice
  );
  const resolvedIsActive = statusOverride ?? item.isActive ?? false;
  const displayUpdated = updatedTimestamp ?? item.lastUpdated ?? "";
  const formattedUpdated = displayUpdated ? formatDateLabel(displayUpdated) : "-";
  const hasPromoForRow =
    typeof item.promoPrice === "number" &&
    Number.isFinite(item.promoPrice) &&
    item.promoPrice > 0;
  const isEditingProduct = editControls.editingProductId === item.id;
  const currentEditForm = isEditingProduct ? editControls.productEditForm : null;
  const previewPrices = currentEditForm
    ? {
        ctv: parseRatioInput(currentEditForm.pctCtv),
        customer: parseRatioInput(currentEditForm.pctKhach),
        promo: parseRatioInput(currentEditForm.pctPromo),
        student: parseRatioInput(currentEditForm.pctStu),
      }
    : null;
  const previewWholesalePrice = previewPrices?.ctv ?? null;
  const previewRetailPrice = previewPrices?.customer ?? null;
  const previewPromoPrice = previewPrices?.promo ?? null;
  const showPreviewPromo =
    typeof previewPromoPrice === "number" &&
    Number.isFinite(previewPromoPrice) &&
    previewPromoPrice > 0;
  const previewStudentPriceVal = previewPrices?.student ?? null;
  const showPreviewStudent =
    Boolean(previewPrices) &&
    typeof previewStudentPriceVal === "number" &&
    Number.isFinite(previewStudentPriceVal) &&
    previewStudentPriceVal > 0;
  const displayStudentPrice =
    isEditingProduct && currentEditForm ? previewStudentPriceVal : item.studentPrice;
  const highestSupplyPriceDisplay =
    typeof highestSupplyPrice === "number" &&
    Number.isFinite(highestSupplyPrice) &&
    highestSupplyPrice > 0
      ? formatCurrencyValue(highestSupplyPrice)
      : "Chưa có dữ liệu";
  const profitBasePrice =
    typeof highestSupplyPrice === "number" &&
    Number.isFinite(highestSupplyPrice) &&
    highestSupplyPrice > 0
      ? highestSupplyPrice
      : item.baseSupplyPrice;

  return {
    supplierItems,
    cheapestPrice,
    cheapestSupplierName,
    resolvedIsActive,
    formattedUpdated,
    hasPromoForRow,
    isEditingProduct,
    currentEditForm,
    previewWholesalePrice,
    previewRetailPrice,
    previewPromoPrice,
    showPreviewPromo,
    previewStudentPriceVal,
    showPreviewStudent,
    displayStudentPrice,
    highestSupplyPriceDisplay,
    wholesaleProfitLabel:
      formatProfitPercentBySale(item.wholesalePrice, profitBasePrice, "short") ??
      "Chưa có %",
    retailProfitLabel:
      formatProfitPercentBySale(item.retailPrice, profitBasePrice, "short") ??
      "Chưa có %",
    studentProfitLabel:
      formatProfitPercentBySale(displayStudentPrice, profitBasePrice, "short") ??
      "Chưa có %",
    promoProfitLabel:
      formatProfitPercentBySale(item.promoPrice, profitBasePrice, "short") ??
      "Chưa có %",
    previewWholesaleProfitLabel: formatProfitPercentBySale(
      previewWholesalePrice,
      profitBasePrice,
      "full"
    ),
    previewRetailProfitLabel: formatProfitPercentBySale(
      previewRetailPrice,
      profitBasePrice,
      "full"
    ),
    previewStudentBlendHint: formatProfitPercentBySale(
      previewStudentPriceVal,
      profitBasePrice,
      "full"
    ),
    previewPromoPercentLabel: formatProfitPercentBySale(
      previewPromoPrice,
      profitBasePrice,
      "full"
    ),
  };
};
