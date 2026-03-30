import type {
  DeleteProductState,
  NewSupplyRowState,
  ProductPricingRow,
  SupplyPriceState,
} from "../../types";
import { normalizeProductKey } from "../../utils";
import ProductRow from "../ProductRow";
import type {
  ProductRowEditControls,
  ProductRowSupplyControls,
} from "../productRowContracts";

type ProductTableDesktopSectionProps = {
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

export function ProductTableDesktopSection({
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
}: ProductTableDesktopSectionProps) {
  return (
    <div className="overflow-x-auto hidden md:block">
      <table className="min-w-full divide-y divide-white/10 text-white">
        <thead className="bg-white/5">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
              Sản Phẩm
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
              Giá Gốc
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
              Giá Sỉ
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
              Giá Lẻ
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
              Giá Khuyến Mãi
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
              Tình Trạng Sản Phẩm
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
              Cập Nhật
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
              Thao Tác
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 bg-white/5">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="px-6 py-8 text-center text-sm text-white/80">
                Đang Tải Dữ Liệu...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-6 py-8 text-center text-sm text-white/80">
                {error
                  ? "Không thể tải dữ liệu. Vui lòng thử lại."
                  : "Không có sản phẩm."}
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isExpanded = expandedProductId === item.id;
              const productKey = normalizeProductKey(item.sanPhamRaw);
              const supplyState = supplyPriceMap[productKey];
              const pendingNewSupply = newSupplyRows[item.id] || null;
              const isDeletingCurrent =
                deleteProductState.product?.id === item.id &&
                deleteProductState.loading;

              return (
                <ProductRow
                  key={item.id}
                  item={item}
                  productKey={productKey}
                  isExpanded={isExpanded}
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
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
