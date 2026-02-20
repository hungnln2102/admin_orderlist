import React from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  PencilIcon,
  PlusCircleIcon,
  PowerIcon,
  TrashIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  NewSupplyRowState,
  ProductEditFormState,
  ProductPricingRow,
  SupplierOption,
  SupplyPriceState,
} from "../types";
import {
  buildSupplyRowKey,
  calculatePromoPrice,
  computeHighestSupplyPrice,
  formatCurrencyValue,
  formatDateLabel,
  formatProfitRange,
  formatPromoPercent,
  formatRateDescription,
  hasValidPromoRatio,
  multiplyBasePrice,
  multiplyValue,
  parseRatioInput,
  pickCheapestSupplier,
} from "../utils";

interface ProductRowProps {
  item: ProductPricingRow;
  productKey: string;
  isExpanded: boolean;
  statusOverride?: boolean;
  updatedTimestamp?: string;
  supplyState?: SupplyPriceState;
  pendingNewSupply?: NewSupplyRowState | null;
  supplierOptions: SupplierOption[];
  isLoadingSuppliers: boolean;
  editingProductId: number | null;
  productEditForm: ProductEditFormState | null;
  productEditError: string | null;
  isSavingProductEdit: boolean;
  isDeletingProduct: boolean;
  editingSupplyRows: Record<string, boolean>;
  supplyPriceDrafts: Record<string, string>;
  savingSupplyRows: Record<string, boolean>;
  supplyRowErrors: Record<string, string | null>;
  onToggleProductDetails: (product: ProductPricingRow) => void;
  onStartProductEdit: (
    event: React.MouseEvent<HTMLButtonElement>,
    product: ProductPricingRow
  ) => void;
  onProductEditChange: (
    field: keyof ProductEditFormState,
    value: string
  ) => void;
  onCancelProductEdit: () => void;
  onSubmitProductEdit: () => void;
  onRequestDeleteProduct: (
    event: React.MouseEvent<HTMLButtonElement>,
    product: ProductPricingRow
  ) => void;
  onStartEditingSupply: (
    productId: number,
    sourceId: number,
    currentPrice: number | null
  ) => void;
  onSupplyInputChange: (
    productId: number,
    sourceId: number,
    value: string
  ) => void;
  onCancelSupplyEditing: (productId: number, sourceId: number) => void;
  onConfirmSupplyEditing: (
    productId: number,
    sourceId: number,
    productKey: string,
    productName: string
  ) => void;
  onStartAddSupplierRow: (productId: number) => void;
  onNewSupplierInputChange: (
    productId: number,
    field: "sourceName" | "price" | "sourceId" | "useCustomName",
    value: string | number | boolean | null
  ) => void;
  onCancelAddSupplierRow: (productId: number) => void;
  onConfirmAddSupplierRow: (product: ProductPricingRow) => void;
  onDeleteSupplyRow: (
    productId: number,
    sourceId: number,
    productKey: string,
    productName: string
  ) => void;
  onToggleStatus: (item: ProductPricingRow) => void;
  fetchSupplyPricesForProduct: (productName: string) => void;
}

const ProductRowComponent: React.FC<ProductRowProps> = ({
  item,
  productKey,
  isExpanded,
  statusOverride,
  updatedTimestamp,
  supplyState,
  pendingNewSupply,
  supplierOptions,
  isLoadingSuppliers,
  editingProductId,
  productEditForm,
  productEditError,
  isSavingProductEdit,
  isDeletingProduct,
  editingSupplyRows,
  supplyPriceDrafts,
  savingSupplyRows,
  supplyRowErrors,
  onToggleProductDetails,
  onStartProductEdit,
  onProductEditChange,
  onCancelProductEdit,
  onSubmitProductEdit,
  onRequestDeleteProduct,
  onStartEditingSupply,
  onSupplyInputChange,
  onCancelSupplyEditing,
  onConfirmSupplyEditing,
  onStartAddSupplierRow,
  onNewSupplierInputChange,
  onCancelAddSupplierRow,
  onConfirmAddSupplierRow,
  onDeleteSupplyRow,
  onToggleStatus,
  fetchSupplyPricesForProduct,
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
  const composedSupplierRows = [
    ...supplierItems.map((supplier) => ({
      kind: "existing" as const,
      supplier,
    })),
    ...(resolvedPendingNewSupply ? [{ kind: "new" as const }] : []),
  ];
  const resolvedIsActive = statusOverride ?? item.isActive ?? false;
  const displayUpdated = updatedTimestamp ?? item.lastUpdated ?? "";
  const formattedUpdated = displayUpdated
    ? formatDateLabel(displayUpdated)
    : "-";
  const hasPromoForRow = hasValidPromoRatio(
    item.pctPromo,
    item.pctKhach,
    item.pctCtv
  );
  const isEditingProduct = editingProductId === item.id;
  const currentEditForm = isEditingProduct ? productEditForm : null;
  const previewRatios = currentEditForm
    ? {
        pctCtv: parseRatioInput(currentEditForm.pctCtv),
        pctKhach: parseRatioInput(currentEditForm.pctKhach),
        pctPromo: parseRatioInput(currentEditForm.pctPromo),
      }
    : null;
  const previewWholesalePrice = previewRatios
    ? multiplyBasePrice(previewRatios.pctCtv, highestSupplyPrice)
    : null;
  const resolvedWholesaleBase =
    typeof previewWholesalePrice === "number" &&
    Number.isFinite(previewWholesalePrice) &&
    previewWholesalePrice > 0
      ? previewWholesalePrice
      : highestSupplyPrice;
  const previewRetailPrice = previewRatios
    ? multiplyValue(resolvedWholesaleBase, previewRatios.pctKhach)
    : null;
  const previewPromoPrice = previewRatios
    ? calculatePromoPrice(
        previewRatios.pctKhach,
        previewRatios.pctPromo,
        previewRatios.pctCtv,
        previewWholesalePrice,
        highestSupplyPrice
      )
    : null;
  const previewPromoPercentLabel = formatPromoPercent(
    previewRatios?.pctPromo ?? null
  );
  const showPreviewPromo =
    hasValidPromoRatio(
      previewRatios?.pctPromo ?? null,
      previewRatios?.pctKhach ?? null,
      previewRatios?.pctCtv ?? null
    ) && Number.isFinite(previewPromoPrice ?? NaN);
  const highestSupplyPriceDisplay =
    typeof highestSupplyPrice === "number" &&
    Number.isFinite(highestSupplyPrice) &&
    highestSupplyPrice > 0
      ? formatCurrencyValue(highestSupplyPrice)
      : "Chưa có dữ liệu";

  const handleReloadSupply = () => {
    fetchSupplyPricesForProduct(item.sanPhamRaw);
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
          <div className="text-sm font-semibold text-white">
            {formatCurrencyValue(item.wholesalePrice)}
          </div>
          <div className="text-xs text-white/70">
            {formatRateDescription({
              multiplier: item.pctCtv,
              price: item.wholesalePrice,
              basePrice: item.baseSupplyPrice,
            })}
          </div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div className="text-sm font-semibold text-amber-300">
            {formatCurrencyValue(item.retailPrice)}
          </div>
          <div className="text-xs text-white/70">
            {formatRateDescription({
              multiplier: item.pctKhach,
              price: item.retailPrice,
              basePrice: item.baseSupplyPrice,
            })}
          </div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          {hasPromoForRow ? (
            <>
              <div className="text-sm font-semibold text-pink-200">
                {formatCurrencyValue(item.promoPrice)}
              </div>
              <div className="text-xs text-white/70">
                {formatPromoPercent(item.pctPromo) ?? "-"}
              </div>
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
              onClick={(event) => onStartProductEdit(event, item)}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              className={`text-rose-400 hover:text-rose-300 ${
                isDeletingProduct ? "cursor-not-allowed opacity-60" : ""
              }`}
              onClick={(event) => onRequestDeleteProduct(event, item)}
              disabled={isDeletingProduct}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
      {isEditingProduct && currentEditForm && (
        <tr>
          <td colSpan={7} className="px-2 md:px-6 pb-4 md:pb-6">
            <div className="space-y-4 md:space-y-6 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/80 via-slate-900/70 to-indigo-950/80 px-3 py-4 md:px-6 md:py-5 text-white shadow-lg">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-5 shadow-lg">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">
                    Thông Tin Sản Phẩm
                  </p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                        Tên sản phẩm
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                        value={currentEditForm.packageName}
                        onChange={(event) =>
                          onProductEditChange("packageName", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                        Gói sản phẩm
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                        value={currentEditForm.packageProduct}
                        onChange={(event) =>
                          onProductEditChange(
                            "packageProduct",
                            event.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                        Mã sản phẩm
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                        value={currentEditForm.sanPham}
                        onChange={(event) =>
                          onProductEditChange("sanPham", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-5 shadow-lg">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">
                    Tỷ giá
                  </p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                        Tỷ giá CTV
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={currentEditForm.pctCtv}
                        onChange={(event) =>
                          onProductEditChange("pctCtv", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                        Tỷ giá khách
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={currentEditForm.pctKhach}
                        onChange={(event) =>
                          onProductEditChange("pctKhach", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                        Tỷ giá khuyến mãi
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={currentEditForm.pctPromo}
                        onChange={(event) =>
                          onProductEditChange("pctPromo", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              {currentEditForm && (
                <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-950/70 via-slate-900/70 to-indigo-950/80 p-3 md:p-4 shadow-lg backdrop-blur">
                  <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/80 sm:flex-row sm:items-center sm:justify-between">
                    <span>Giá dự kiến theo tỉ giá</span>
                    <span className="font-medium normal-case text-amber-200">
                      Giá nguồn cao nhất:{" "}
                      <span className="font-semibold">
                        {highestSupplyPriceDisplay}
                      </span>
                    </span>
                  </div>
                  <div
                    className={`mt-3 md:mt-4 grid gap-2 md:gap-3 text-center text-sm grid-cols-2 ${
                      showPreviewPromo ? "md:grid-cols-3" : "md:grid-cols-2"
                    }`}
                  >
                    <div className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3 shadow-lg backdrop-blur-sm">
                      <p className="text-[10px] md:text-xs uppercase text-white/70">
                        Giá Sỉ dự kiến
                      </p>
                      <p className="mt-1 text-base md:text-lg font-semibold text-white">
                        {formatCurrencyValue(previewWholesalePrice)}
                      </p>
                      <p className="text-[11px] text-white/70">
                        {currentEditForm.pctCtv
                          ? `Tỷ Giá: ${currentEditForm.pctCtv}`
                          : "Nhập tỉ giá CTV"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3 shadow-lg backdrop-blur-sm">
                      <p className="text-[10px] md:text-xs uppercase text-white/70">
                        Giá Khách dự kiến
                      </p>
                      <p className="mt-1 text-base md:text-lg font-semibold text-white">
                        {formatCurrencyValue(previewRetailPrice)}
                      </p>
                      <p className="text-[11px] text-white/70">
                        {currentEditForm.pctKhach
                          ? `Tỷ Giá: ${currentEditForm.pctKhach}`
                          : "Nhập tỉ giá khách"}
                      </p>
                    </div>
                    {showPreviewPromo && (
                      <div className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3 shadow-lg backdrop-blur-sm">
                        <p className="text-[10px] md:text-xs uppercase text-white/70">
                          Giá Khuyến mãi dự kiến
                        </p>
                        <p className="mt-1 text-base md:text-lg font-semibold text-white">
                          {formatCurrencyValue(previewPromoPrice)}
                        </p>
                        <p className="text-[11px] text-white/70">
                          {previewPromoPercentLabel ??
                            "Nhập tỉ giá khuyến mãi"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {productEditError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                  {productEditError}
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  className="inline-flex items-center rounded-xl border border-white/25 bg-white/10 px-4 md:px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-white/60 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={onCancelProductEdit}
                  disabled={isSavingProductEdit}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500 px-4 md:px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200/50 hover:opacity-90 disabled:opacity-60"
                  onClick={onSubmitProductEdit}
                  disabled={isSavingProductEdit}
                >
                  {isSavingProductEdit ? "Đang Lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="px-2 md:px-6 pb-4 md:pb-6">
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-2 md:p-4 text-white">
              <div className="space-y-4 rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-950/80 via-slate-900/70 to-indigo-950/80 px-3 py-4 md:px-6 md:py-5 text-white shadow-lg">
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">
                    Chi tiết giá sản phẩm
                  </p>
                </div>
                <div
                  className={`grid gap-2 md:gap-4 text-center grid-cols-2 ${
                    hasPromoForRow ? "md:grid-cols-4" : "md:grid-cols-3"
                  }`}
                >
                  <div className="flex flex-col items-center rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3">
                    <p className="text-[10px] md:text-xs uppercase text-white/70">
                      Giá nguồn thấp nhất
                    </p>
                    <p className="mt-1 text-base md:text-lg font-semibold text-white">
                      {formatCurrencyValue(cheapestPrice)}
                    </p>
                    <p className="text-[10px] md:text-xs text-white/70 truncate max-w-full">
                      {cheapestSupplierName}
                    </p>
                  </div>
                  <div className="flex flex-col items-center rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3">
                    <p className="text-[10px] md:text-xs uppercase text-white/70">
                      Giá sỉ hiện tại
                    </p>
                    <p className="mt-1 text-base md:text-lg font-semibold text-white">
                      {formatCurrencyValue(item.wholesalePrice)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3">
                    <p className="text-[10px] md:text-xs uppercase text-white/70">
                      Giá khách hiện tại
                    </p>
                    <p className="mt-1 text-base md:text-lg font-semibold text-white">
                      {formatCurrencyValue(item.retailPrice)}
                    </p>
                  </div>
                  {hasPromoForRow && (
                    <div className="flex flex-col items-center rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3">
                      <p className="text-[10px] md:text-xs uppercase text-white/70">
                        Giá KM hiện tại
                      </p>
                      <p className="mt-1 text-base md:text-lg font-semibold text-white">
                        {formatCurrencyValue(item.promoPrice)}
                      </p>
                      <p className="text-[10px] md:text-xs text-white/70">
                        {formatPromoPercent(item.pctPromo) ?? "-"}
                      </p>
                    </div>
                  )}
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/15">
                  <div className="flex justify-end border-b border-white/10 bg-white/5 px-4 py-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-white/20 hover:bg-white/15 disabled:opacity-50"
                      onClick={() => onStartAddSupplierRow(item.id)}
                      disabled={Boolean(resolvedPendingNewSupply)}
                    >
                      <PlusCircleIcon className="h-4 w-4" />
                      Thêm nguồn
                    </button>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-[11px] uppercase tracking-wide text-white/70">
                      <tr>
                        <th className="px-2 md:px-4 py-2 text-left">NCC</th>
                        <th className="px-2 md:px-4 py-2 text-center">Giá nhập</th>
                        <th className="hidden md:table-cell px-4 py-2 text-center">Lợi nhuận</th>
                        <th className="px-2 md:px-4 py-2 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplyState?.loading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-3 text-center text-xs text-white/70"
                          >
                            Đang Tải Dữ Liệu
                          </td>
                        </tr>
                      ) : supplyState?.error ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-3 text-center text-xs text-white"
                          >
                            <span>{supplyState.error}</span>{" "}
                            <button
                              type="button"
                              className="text-xs text-red-400 hover:text-red-200 hover:underline"
                              onClick={handleReloadSupply}
                            >
                              Thử Lại
                            </button>
                          </td>
                        </tr>
                      ) : supplierItems.length === 0 &&
                        composedSupplierRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-3 text-center text-xs text-white/70"
                          >
                            Chưa có dữ liệu từ NCC
                          </td>
                        </tr>
                      ) : (
                        composedSupplierRows.map((row) => {
                          if (row.kind === "existing" && row.supplier) {
                            const supplier = row.supplier;
                            const rowKey = buildSupplyRowKey(
                              item.id,
                              supplier.sourceId
                            );
                            const isRowEditing =
                              editingSupplyRows[rowKey] ?? false;
                            const isRowSaving =
                              savingSupplyRows[rowKey] ?? false;
                            const inputValue =
                              supplyPriceDrafts[rowKey] ??
                              (supplier.price ?? "").toString();
                            const inputError = supplyRowErrors[rowKey];
                            const inputDisabled = !isRowEditing || isRowSaving;

                            const displayPrice = formatCurrencyValue(
                              supplier.price
                            );

                            return (
                              <tr
                                key={rowKey}
                                className="border-t border-dashed border-white/10"
                              >
                                <td className="px-2 md:px-4 py-3">
                                  <div className="text-xs md:text-sm font-semibold text-white truncate max-w-[80px] md:max-w-none">
                                    {supplier.sourceName}
                                  </div>
                                </td>
                                <td className="px-2 md:px-4 py-3">
                                  {isRowEditing ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          className="w-20 md:w-28 rounded-lg border border-white/25 bg-white/5 px-2 py-1 text-center text-xs md:text-sm text-white placeholder:text-white/50 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/30 appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                          value={inputValue}
                                          onChange={(event) =>
                                            onSupplyInputChange(
                                              item.id,
                                              supplier.sourceId,
                                              event.target.value
                                            )
                                          }
                                          disabled={inputDisabled}
                                        />
                                        <span className="text-xs text-white/70">
                                          đ
                                        </span>
                                      </div>
                                      <span className="hidden md:inline text-[11px] text-white/60">
                                        Nhập giá mới
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex justify-center">
                                      <span className="inline-flex min-w-0 md:min-w-[112px] justify-center rounded-lg bg-white/10 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-white">
                                        {displayPrice}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="hidden md:table-cell px-4 py-3 text-center text-xs text-white/70">
                                  {formatProfitRange(
                                    supplier.price,
                                    item.wholesalePrice,
                                    item.retailPrice
                                  )}
                                </td>
                                <td className="px-2 md:px-4 py-3">
                                  {isRowEditing ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600/20 text-green-200 hover:bg-green-500/30 disabled:opacity-60"
                                        disabled={isRowSaving}
                                        onClick={() =>
                                          onConfirmSupplyEditing(
                                            item.id,
                                            supplier.sourceId,
                                            productKey,
                                            item.sanPhamRaw
                                          )
                                        }
                                      >
                                        <CheckIcon className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/20 text-red-200 hover:bg-red-500/30 disabled:opacity-60"
                                        disabled={isRowSaving}
                                        onClick={() =>
                                          onCancelSupplyEditing(
                                            item.id,
                                            supplier.sourceId
                                          )
                                        }
                                      >
                                        <XMarkIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-white/80 hover:border-white/40 hover:text-white disabled:opacity-60"
                                        disabled={isRowSaving}
                                        onClick={() =>
                                          onStartEditingSupply(
                                            item.id,
                                            supplier.sourceId,
                                            supplier.price
                                          )
                                        }
                                      >
                                        <PencilIcon className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200/60 text-red-200 hover:border-red-200 hover:bg-red-500/10 disabled:opacity-60"
                                        disabled={isRowSaving}
                                        onClick={() =>
                                          onDeleteSupplyRow(
                                            item.id,
                                            supplier.sourceId,
                                            productKey,
                                            item.sanPhamRaw
                                          )
                                        }
                                      >
                                        <XCircleIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          }


                          if (row.kind === "new" && resolvedPendingNewSupply) {
                            const draft = resolvedPendingNewSupply;
                            const selectValue = draft.useCustomName
                              ? "__custom__"
                              : draft.sourceId !== null
                              ? `id:${draft.sourceId}`
                              : draft.sourceName
                              ? `name:${draft.sourceName}`
                              : "";
                            const hasOptions = supplierOptions.length > 0;

                            const handleSupplierSelect = (
                              event: React.ChangeEvent<HTMLSelectElement>
                            ) => {
                              const value = event.target.value;
                              if (value === "__custom__") {
                                onNewSupplierInputChange(
                                  item.id,
                                  "useCustomName",
                                  true
                                );
                                onNewSupplierInputChange(
                                  item.id,
                                  "sourceName",
                                  ""
                                );
                                onNewSupplierInputChange(
                                  item.id,
                                  "sourceId",
                                  null
                                );
                                return;
                              }

                              onNewSupplierInputChange(
                                item.id,
                                "useCustomName",
                                false
                              );

                              if (!value) {
                                onNewSupplierInputChange(
                                  item.id,
                                  "sourceId",
                                  null
                                );
                                onNewSupplierInputChange(
                                  item.id,
                                  "sourceName",
                                  ""
                                );
                                return;
                              }

                              const matched = supplierOptions.find((option) => {
                                const key =
                                  option.id !== null
                                    ? `id:${option.id}`
                                    : `name:${option.name}`;
                                return key === value;
                              });

                              onNewSupplierInputChange(
                                item.id,
                                "sourceId",
                                matched?.id ?? null
                              );
                              onNewSupplierInputChange(
                                item.id,
                                "sourceName",
                                matched?.name ?? value.replace(/^name:/, "").trim()
                              );
                            };

                            return (
                              <React.Fragment key={`new-${item.id}`}>
                                <tr className="border-t border-dashed border-white/15 bg-slate-900/50">
                                  <td className="px-2 md:px-4 py-3">
                                    <div className="flex flex-col gap-2">
                                      {hasOptions && !draft.useCustomName ? (
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                                          <select
                                            className="w-full md:w-60 md:max-w-xs rounded-lg border border-white/20 bg-slate-900/80 px-2 md:px-3 py-2 text-xs md:text-sm text-white shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-300/30 disabled:opacity-60"
                                            value={selectValue}
                                            onChange={handleSupplierSelect}
                                            disabled={draft.isSaving}
                                          >
                                            <option value="">
                                              {isLoadingSuppliers
                                                ? "Đang tải Nhà Cung Cấp..."
                                                : "Chọn Nhà Cung Cấp..."}
                                            </option>
                                            {supplierOptions.map((option) => {
                                              const key =
                                                option.id !== null
                                                  ? `id:${option.id}`
                                                  : `name:${option.name}`;
                                              return (
                                                <option key={key} value={key}>
                                                  {option.name}
                                                </option>
                                              );
                                            })}
                                            <option value="__custom__">
                                              Nhập tên Nhà Cung Cấp khác
                                            </option>
                                          </select>
                                          <button
                                            type="button"
                                            className="rounded-md border border-white/20 px-2 py-1 text-xs text-white/80 hover:border-indigo-300 hover:text-white"
                                            onClick={() =>
                                              onNewSupplierInputChange(
                                                item.id,
                                                "useCustomName",
                                                true
                                              )
                                            }
                                            disabled={draft.isSaving}
                                          >
                                            Nhập
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap items-center gap-2">
                                          {hasOptions && (
                                            <button
                                              type="button"
                                              className="flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs text-white/80 hover:border-indigo-300 hover:text-white"
                                              onClick={() =>
                                                onNewSupplierInputChange(
                                                  item.id,
                                                  "useCustomName",
                                                  false
                                                )
                                              }
                                              disabled={draft.isSaving}
                                            >
                                              <span className="text-sm">←</span>
                                              <span className="sr-only">Chọn từ danh sách</span>
                                            </button>
                                          )}
                                          <input
                                            type="text"
                                            className="w-60 max-w-xs rounded-lg border border-indigo-300/60 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                            placeholder="Tên NCC"
                                            value={draft.sourceName}
                                            onChange={(event) =>
                                              onNewSupplierInputChange(
                                                item.id,
                                                "sourceName",
                                                event.target.value
                                              )
                                            }
                                            disabled={draft.isSaving}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-2 md:px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <input
                                        type="text"
                                        className="w-20 md:w-28 rounded-lg border border-sky-200 bg-white px-2 py-1 text-center text-xs md:text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200 appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        placeholder="Giá nhập"
                                        value={draft.price}
                                        onChange={(event) =>
                                          onNewSupplierInputChange(
                                            item.id,
                                            "price",
                                            event.target.value
                                          )
                                        }
                                        disabled={draft.isSaving}
                                      />
                                      <span className="text-xs text-white/70">
                                        đ
                                      </span>
                                    </div>
                                  </td>
                                  <td className="hidden md:table-cell px-4 py-3 text-center text-xs text-white/70">
                                    -
                                  </td>
                                  <td className="px-2 md:px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600/20 text-green-200 hover:bg-green-500/30 disabled:opacity-60"
                                        disabled={draft.isSaving}
                                        onClick={() => onConfirmAddSupplierRow(item)}
                                      >
                                        <CheckIcon className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/20 text-red-200 hover:bg-red-500/30 disabled:opacity-60"
                                        disabled={draft.isSaving}
                                        onClick={() => onCancelAddSupplierRow(item.id)}
                                      >
                                        <XMarkIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {draft.error && (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="px-4 pb-3 text-center text-xs text-red-200"
                                    >
                                      {draft.error}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          }

                                                    return null;
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

const ProductRow = React.memo(ProductRowComponent);

export default ProductRow;
