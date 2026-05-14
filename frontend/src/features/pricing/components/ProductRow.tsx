import React from "react";
import {
  ChevronDownIcon,
  PencilIcon,
  PowerIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { ProductPricingRow } from "../types";
import {
  computeHighestSupplyPrice,
  formatCurrencyValue,
  formatDateLabel,
  formatProfitPercentBySale,
  parseRatioInput,
  pickCheapestSupplier,
} from "../utils";
import { ProductEditPanel } from "./ProductEditPanel";
import { ProductExpandedDetails } from "./ProductExpandedDetails";
import type {
  ProductRowEditControls,
  ProductRowSupplyControls,
  ProductRowSupplyState,
} from "./productRowContracts";

interface ProductRowProps extends ProductRowSupplyState {
  item: ProductPricingRow;
  productKey: string;
  isExpanded: boolean;
  statusOverride?: boolean;
  updatedTimestamp?: string;
  isDeletingProduct: boolean;
  editControls: ProductRowEditControls;
  supplyControls: ProductRowSupplyControls;
  onToggleProductDetails: (product: ProductPricingRow) => void;
  onToggleStatus: (item: ProductPricingRow) => void;
}

const ProductRowComponent: React.FC<ProductRowProps> = ({
  item,
  productKey,
  isExpanded,
  statusOverride,
  updatedTimestamp,
  isDeletingProduct,
  editControls,
  supplyControls,
  supplyState,
  pendingNewSupply,
  onToggleProductDetails,
  onToggleStatus,
}) => {
  const supplierItems = supplyState?.items ?? [];
  const resolvedPendingNewSupply = pendingNewSupply ?? null;
  const cheapestSupplier = pickCheapestSupplier(supplierItems);
  const cheapestPrice = cheapestSupplier?.price ?? item.baseSupplyPrice;
  const cheapestSupplierName = cheapestSupplier?.sourceName ?? "-";
  const highestSupplyPrice = computeHighestSupplyPrice(
    supplierItems,
    item.baseSupplyPrice
  );
  const resolvedIsActive = statusOverride ?? item.isActive ?? false;
  const displayUpdated = updatedTimestamp ?? item.lastUpdated ?? "";
  const formattedUpdated = displayUpdated
    ? formatDateLabel(displayUpdated)
    : "-";
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

  const wholesaleProfitLabel =
    formatProfitPercentBySale(item.wholesalePrice, profitBasePrice, "short") ??
    "Chưa có %";
  const retailProfitLabel =
    formatProfitPercentBySale(item.retailPrice, profitBasePrice, "short") ??
    "Chưa có %";
  const studentProfitLabel =
    formatProfitPercentBySale(displayStudentPrice, profitBasePrice, "short") ??
    "Chưa có %";
  const promoProfitLabel =
    formatProfitPercentBySale(item.promoPrice, profitBasePrice, "short") ??
    "Chưa có %";

  const previewWholesaleProfitLabel = formatProfitPercentBySale(
    previewWholesalePrice,
    profitBasePrice,
    "full"
  );
  const previewRetailProfitLabel = formatProfitPercentBySale(
    previewRetailPrice,
    profitBasePrice,
    "full"
  );
  const previewStudentBlendHint = formatProfitPercentBySale(
    previewStudentPriceVal,
    profitBasePrice,
    "full"
  );
  const previewPromoPercentLabel = formatProfitPercentBySale(
    previewPromoPrice,
    profitBasePrice,
    "full"
  );

  const handleReloadSupply = () => {
    supplyControls.fetchSupplyPricesForProduct(item.sanPhamRaw);
  };

  return (
    <React.Fragment>
      <tr
        className="hidden md:table-row cursor-pointer bg-gradient-to-r from-indigo-950/70 via-slate-900/60 to-indigo-950/70 transition hover:from-indigo-900/70 hover:via-indigo-800/50 hover:to-indigo-900/70"
        onClick={() => onToggleProductDetails(item)}
      >
        <td className="whitespace-nowrap px-6 py-4">
          <div className="flex items-start gap-3">
            <ChevronDownIcon
              className={`mt-1 h-4 w-4 text-white/60 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
            <div>
              <div className="text-sm font-semibold text-white">
                {item.packageName}
              </div>
              <div className="text-xs text-white/70">{item.variantLabel}</div>
            </div>
          </div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div className="text-sm font-semibold text-slate-200">
            {formatCurrencyValue(item.basePrice)}
          </div>
          <div className="text-xs text-white/50">Giá gốc</div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div className="text-sm font-semibold text-white">
            {formatCurrencyValue(item.wholesalePrice)}
          </div>
          <div className="text-xs text-white/55">{wholesaleProfitLabel}</div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div className="text-sm font-semibold text-amber-300">
            {formatCurrencyValue(item.retailPrice)}
          </div>
          <div className="text-xs text-white/55">{retailProfitLabel}</div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div
            className={`text-sm font-semibold ${
              isEditingProduct && showPreviewStudent ? "text-sky-300" : "text-sky-200"
            }`}
          >
            {formatCurrencyValue(displayStudentPrice)}
          </div>
          <div className="text-xs text-white/55">{studentProfitLabel}</div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          {hasPromoForRow ? (
            <>
              <div className="text-sm font-semibold text-pink-200">
                {formatCurrencyValue(item.promoPrice)}
              </div>
              <div className="text-xs text-white/55">{promoProfitLabel}</div>
            </>
          ) : (
            <div className="text-sm text-white/60">-</div>
          )}
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleStatus(item);
              }}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-inner transition ${
                resolvedIsActive
                  ? "border-emerald-200 bg-emerald-500 text-white"
                  : "border-white/20 bg-white/10 text-white/60"
              }`}
              aria-pressed={resolvedIsActive}
            >
              <PowerIcon className="h-4 w-4" />
            </button>
          </div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div className="text-sm text-white">{formattedUpdated}</div>
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
          <div className="flex items-center justify-end gap-3">
            <button
              className="text-blue-300 hover:text-blue-200"
              onClick={(event) => editControls.onStartProductEdit(event, item)}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              className={`text-rose-400 hover:text-rose-300 ${
                isDeletingProduct ? "cursor-not-allowed opacity-60" : ""
              }`}
              onClick={(event) =>
                editControls.onRequestDeleteProduct(event, item)
              }
              disabled={isDeletingProduct}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
      {isEditingProduct && currentEditForm && (
        <tr>
          <td colSpan={9} className="px-2 md:px-6 pb-4 md:pb-6">
            <ProductEditPanel
              productId={item.id}
              currentEditForm={currentEditForm}
              productNameOptions={editControls.productNameOptions}
              highestSupplyPriceDisplay={highestSupplyPriceDisplay}
              previewWholesaleProfitLabel={previewWholesaleProfitLabel}
              previewRetailProfitLabel={previewRetailProfitLabel}
              previewWholesalePrice={previewWholesalePrice}
              previewRetailPrice={previewRetailPrice}
              previewStudentPrice={previewStudentPriceVal}
              previewStudentBlendHint={previewStudentBlendHint}
              previewPromoPrice={previewPromoPrice}
              previewPromoPercentLabel={previewPromoPercentLabel}
              showPreviewPromo={showPreviewPromo}
              showPreviewStudent={showPreviewStudent}
              productEditError={editControls.productEditError}
              isSavingProductEdit={editControls.isSavingProductEdit}
              onProductEditChange={editControls.onProductEditChange}
              onCancelProductEdit={editControls.onCancelProductEdit}
              onSubmitProductEdit={editControls.onSubmitProductEdit}
            />
          </td>
        </tr>
      )}
      {isExpanded && (
        <tr>
          <td colSpan={9} className="px-2 md:px-6 pb-4 md:pb-6">
            <ProductExpandedDetails
              item={item}
              productKey={productKey}
              hasPromoForRow={hasPromoForRow}
              cheapestPrice={cheapestPrice}
              cheapestSupplierName={cheapestSupplierName}
              supplyState={supplyState}
              pendingNewSupply={resolvedPendingNewSupply}
              supplyControls={supplyControls}
              onReloadSupply={handleReloadSupply}
            />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

const ProductRow = React.memo(ProductRowComponent);

export default ProductRow;
