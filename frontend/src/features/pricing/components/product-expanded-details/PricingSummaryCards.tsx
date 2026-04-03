import type { ProductPricingRow } from "../../types";
import {
  formatCurrencyValue,
  formatPromoPercent,
} from "../../utils";

type PricingSummaryCardsProps = {
  item: ProductPricingRow;
  hasPromoForRow: boolean;
  cheapestPrice: number | null;
  cheapestSupplierName: string;
};

export function PricingSummaryCards({
  item,
  hasPromoForRow,
  cheapestPrice,
  cheapestSupplierName,
}: PricingSummaryCardsProps) {
  return (
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
  );
}
