import type {
  DeleteProductState,
  NewSupplyRowState,
  ProductPricingRow,
  SupplyPriceState,
} from "../../types";
import { normalizeProductKey } from "../../utils";
import { PriceCard } from "../PriceCard";
import ProductRow from "../ProductRow";
import type {
  ProductRowEditControls,
  ProductRowSupplyControls,
} from "../productRowContracts";

type ProductTableMobileSectionProps = {
  items: ProductPricingRow[];
  isLoading: boolean;
  error: string | null;
  expandedProductId: number | null;
  supplyPriceMap: Record<string, SupplyPriceState>;
  statusOverrides: Record<number, boolean>;
  updatedTimestampMap: Record<number, string>;
  newSupplyRows: Record<number, NewSupplyRowState>;
  deleteProductState: DeleteProductState;
  editControls: ProductRowEditControls;
  supplyControls: ProductRowSupplyControls;
  onToggleProductDetails: (product: ProductPricingRow) => void;
  onToggleStatus: (item: ProductPricingRow) => void;
};

export function ProductTableMobileSection({
  items,
  isLoading,
  error,
  expandedProductId,
  supplyPriceMap,
  statusOverrides,
  updatedTimestampMap,
  newSupplyRows,
  deleteProductState,
  editControls,
  supplyControls,
  onToggleProductDetails,
  onToggleStatus,
}: ProductTableMobileSectionProps) {
  if (isLoading) {
    return (
      <div className="px-6 py-8 text-center text-sm text-white/80">
        Đang Tải Dữ Liệu...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-sm text-white/80">
        {error ? "Không thể tải dữ liệu. Vui lòng thử lại." : "Không có sản phẩm."}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {items.map((item) => {
        const isExpanded = expandedProductId === item.id;
        const isDeletingCurrent =
          deleteProductState.product?.id === item.id && deleteProductState.loading;
        const productKey = normalizeProductKey(item.sanPhamRaw);
        const supplyState = supplyPriceMap[productKey];
        const pendingNewSupply = newSupplyRows[item.id] || null;

        return (
          <div key={`card-${item.id}`}>
            <PriceCard
              item={item}
              isExpanded={isExpanded}
              statusOverride={statusOverrides[item.id]}
              updatedTimestamp={updatedTimestampMap[item.id]}
              isDeletingProduct={isDeletingCurrent}
              onToggleProductDetails={onToggleProductDetails}
              onStartProductEdit={(event, product) => {
                if (!isExpanded) {
                  onToggleProductDetails(product);
                }
                editControls.onStartProductEdit(event, product);
              }}
              onRequestDeleteProduct={editControls.onRequestDeleteProduct}
              onToggleStatus={onToggleStatus}
            />
            {isExpanded && (
              <div className="mt-1 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
                <table className="w-full text-white">
                  <tbody>
                    <ProductRow
                      item={item}
                      productKey={productKey}
                      isExpanded={true}
                      statusOverride={statusOverrides[item.id]}
                      updatedTimestamp={updatedTimestampMap[item.id]}
                      isDeletingProduct={isDeletingCurrent}
                      editControls={editControls}
                      supplyControls={supplyControls}
                      supplyState={supplyState}
                      pendingNewSupply={pendingNewSupply}
                      onToggleProductDetails={onToggleProductDetails}
                      onToggleStatus={onToggleStatus}
                    />
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
