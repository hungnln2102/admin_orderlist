import type { ProductPricingRow } from "../types";
import type {
  ProductRowSupplyControls,
  ProductRowSupplyState,
} from "./productRowContracts";
import { PricingSummaryCards } from "./product-expanded-details/PricingSummaryCards";
import { SupplyTable } from "./product-expanded-details/SupplyTable";

type ProductExpandedDetailsProps = {
  item: ProductPricingRow;
  productKey: string;
  hasPromoForRow: boolean;
  cheapestPrice: number | null;
  cheapestSupplierName: string;
  supplyState?: ProductRowSupplyState["supplyState"];
  pendingNewSupply?: ProductRowSupplyState["pendingNewSupply"];
  supplyControls: ProductRowSupplyControls;
  onReloadSupply: () => void;
};

export function ProductExpandedDetails({
  item,
  productKey,
  hasPromoForRow,
  cheapestPrice,
  cheapestSupplierName,
  supplyState,
  pendingNewSupply,
  supplyControls,
  onReloadSupply,
}: ProductExpandedDetailsProps) {
  return (
    <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-2 md:p-4 text-white">
      <div className="space-y-4 rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-950/80 via-slate-900/70 to-indigo-950/80 px-3 py-4 md:px-6 md:py-5 text-white shadow-lg">
        <div className="text-center">
          <p className="text-sm font-semibold text-white">
            Chi tiết giá sản phẩm
          </p>
        </div>

        <PricingSummaryCards
          item={item}
          hasPromoForRow={hasPromoForRow}
          cheapestPrice={cheapestPrice}
          cheapestSupplierName={cheapestSupplierName}
        />

        <SupplyTable
          item={item}
          productKey={productKey}
          supplyState={supplyState}
          pendingNewSupply={pendingNewSupply}
          supplyControls={supplyControls}
          onReloadSupply={onReloadSupply}
        />
      </div>
    </div>
  );
}
