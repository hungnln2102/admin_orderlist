/**
 * PriceCard Component
 * Mobile-friendly card view for price list products
 */

import React from "react";
import {
  ChevronDownIcon,
  PencilIcon,
  PowerIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ProductPricingRow } from "../types";
import {
  formatCurrencyValue,
  formatDateLabel,
  formatPromoPercent,
  formatRateDescription,
  hasValidPromoRatio,
} from "../utils";

interface PriceCardProps {
  item: ProductPricingRow;
  isExpanded: boolean;
  statusOverride?: boolean;
  updatedTimestamp?: string;
  isDeletingProduct: boolean;
  onToggleProductDetails: (product: ProductPricingRow) => void;
  onStartProductEdit: (
    event: React.MouseEvent<HTMLButtonElement>,
    product: ProductPricingRow
  ) => void;
  onRequestDeleteProduct: (
    event: React.MouseEvent<HTMLButtonElement>,
    product: ProductPricingRow
  ) => void;
  onToggleStatus: (item: ProductPricingRow) => void;
}

export const PriceCard: React.FC<PriceCardProps> = ({
  item,
  isExpanded,
  statusOverride,
  updatedTimestamp,
  isDeletingProduct,
  onToggleProductDetails,
  onStartProductEdit,
  onRequestDeleteProduct,
  onToggleStatus,
}) => {
  const resolvedIsActive = statusOverride ?? item.isActive ?? false;
  const displayUpdated = updatedTimestamp ?? item.lastUpdated ?? "";
  const formattedUpdated = displayUpdated ? formatDateLabel(displayUpdated) : "-";
  const hasPromo = hasValidPromoRatio(item.pctPromo, item.pctKhach, item.pctCtv);

  return (
    <div
      className="price-card relative group overflow-hidden glass-panel rounded-[24px] p-4 transition-all duration-500 hover:border-indigo-500/40 shadow-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl hover:bg-slate-900/50 cursor-pointer"
      onClick={() => onToggleProductDetails(item)}
    >
      {/* Glow effect */}
      <div
        className={`absolute -right-10 -top-10 w-28 h-28 rounded-full blur-3xl opacity-10 transition-all duration-700 group-hover:opacity-20 ${
          resolvedIsActive ? "bg-emerald-500" : "bg-slate-500"
        }`}
      />

      <div className="relative z-10 flex flex-col gap-3">
        {/* Header: Product name + variant + status toggle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <ChevronDownIcon
              className={`mt-0.5 h-4 w-4 shrink-0 text-white/60 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
            <div className="min-w-0">
              <h3 className="text-[12px] sm:text-sm font-bold text-white tracking-widest uppercase truncate leading-none">
                {item.packageName}
              </h3>
              {item.variantLabel && (
                <p className="text-[10px] text-white/60 mt-1 truncate">
                  {item.variantLabel}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(item);
            }}
            className={`relative shrink-0 flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-inner transition ${
              resolvedIsActive
                ? "border-emerald-200 bg-emerald-500 text-white"
                : "border-white/20 bg-white/10 text-white/60"
            }`}
            aria-pressed={resolvedIsActive}
          >
            <PowerIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Prices grid */}
        <div className={`grid gap-2 ${hasPromo ? "grid-cols-3" : "grid-cols-2"}`}>
          {/* Wholesale price */}
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1">
              Giá Sỉ
            </span>
            <p className="text-[13px] font-bold text-white tabular-nums">
              {formatCurrencyValue(item.wholesalePrice)}
            </p>
            <p className="text-[9px] text-white/40 mt-0.5 truncate">
              {formatRateDescription({
                multiplier: item.pctCtv,
                price: item.wholesalePrice,
                basePrice: item.baseSupplyPrice,
              })}
            </p>
          </div>

          {/* Retail price */}
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1">
              Giá Lẻ
            </span>
            <p className="text-[13px] font-bold text-amber-300 tabular-nums">
              {formatCurrencyValue(item.retailPrice)}
            </p>
            <p className="text-[9px] text-white/40 mt-0.5 truncate">
              {formatRateDescription({
                multiplier: item.pctKhach,
                price: item.retailPrice,
                basePrice: item.baseSupplyPrice,
              })}
            </p>
          </div>

          {/* Promo price */}
          {hasPromo && (
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1">
                KM
              </span>
              <p className="text-[13px] font-bold text-pink-200 tabular-nums">
                {formatCurrencyValue(item.promoPrice)}
              </p>
              <p className="text-[9px] text-white/40 mt-0.5 truncate">
                {formatPromoPercent(item.pctPromo) ?? "-"}
              </p>
            </div>
          )}
        </div>

        {/* Footer: Updated date + actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-0.5">
              Cập nhật
            </span>
            <p className="text-[11px] font-bold text-slate-300 tabular-nums">
              {formattedUpdated}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-90"
              onClick={(e) => {
                e.stopPropagation();
                onStartProductEdit(e, item);
              }}
              title="Sửa"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              className={`w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500/70 hover:bg-rose-500 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-90 ${
                isDeletingProduct ? "cursor-not-allowed opacity-60" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onRequestDeleteProduct(e, item);
              }}
              disabled={isDeletingProduct}
              title="Xóa"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
