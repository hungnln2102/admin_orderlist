import { PlusCircleIcon } from "@heroicons/react/24/outline";
import type { ProductPricingRow } from "../../types";
import type {
  ProductRowSupplyControls,
  ProductRowSupplyState,
} from "../productRowContracts";
import { buildSupplyRowKey } from "../../utils";
import { ExistingSupplyRow } from "./ExistingSupplyRow";
import { NewSupplyRow } from "./NewSupplyRow";

type SupplyTableProps = {
  item: ProductPricingRow;
  productKey: string;
  supplyState?: ProductRowSupplyState["supplyState"];
  pendingNewSupply?: ProductRowSupplyState["pendingNewSupply"];
  supplyControls: ProductRowSupplyControls;
  onReloadSupply: () => void;
};

export function SupplyTable({
  item,
  productKey,
  supplyState,
  pendingNewSupply,
  supplyControls,
  onReloadSupply,
}: SupplyTableProps) {
  const {
    supplierOptions,
    isLoadingSuppliers,
    editingSupplyRows,
    supplyPriceDrafts,
    savingSupplyRows,
    onStartAddSupplierRow,
    onNewSupplierInputChange,
    onCancelAddSupplierRow,
    onConfirmAddSupplierRow,
    onStartEditingSupply,
    onSupplyInputChange,
    onCancelSupplyEditing,
    onConfirmSupplyEditing,
    onDeleteSupplyRow,
  } = supplyControls;

  const supplierItems = supplyState?.items ?? [];
  const showEmptyState = supplierItems.length === 0 && !pendingNewSupply;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/15">
      <div className="flex justify-end border-b border-white/10 bg-white/5 px-4 py-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-white/20 hover:bg-white/15 disabled:opacity-50"
          onClick={() => onStartAddSupplierRow(item.id)}
          disabled={Boolean(pendingNewSupply)}
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
            <th className="hidden md:table-cell px-4 py-2 text-center">
              Lợi nhuận
            </th>
            <th className="px-2 md:px-4 py-2 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {supplyState?.loading ? (
            <tr>
              <td colSpan={4} className="px-4 py-3 text-center text-xs text-white/70">
                Đang Tải Dữ Liệu
              </td>
            </tr>
          ) : supplyState?.error ? (
            <tr>
              <td colSpan={4} className="px-4 py-3 text-center text-xs text-white">
                <span>{supplyState.error}</span>{" "}
                <button
                  type="button"
                  className="text-xs text-red-400 hover:text-red-200 hover:underline"
                  onClick={onReloadSupply}
                >
                  Thử Lại
                </button>
              </td>
            </tr>
          ) : showEmptyState ? (
            <tr>
              <td colSpan={4} className="px-4 py-3 text-center text-xs text-white/70">
                Chưa có dữ liệu từ NCC
              </td>
            </tr>
          ) : (
            <>
              {supplierItems.map((supplier) => (
                <ExistingSupplyRow
                  key={buildSupplyRowKey(item.id, supplier.sourceId)}
                  item={item}
                  productKey={productKey}
                  supplier={supplier}
                  editingSupplyRows={editingSupplyRows}
                  supplyPriceDrafts={supplyPriceDrafts}
                  savingSupplyRows={savingSupplyRows}
                  onStartEditingSupply={onStartEditingSupply}
                  onSupplyInputChange={onSupplyInputChange}
                  onCancelSupplyEditing={onCancelSupplyEditing}
                  onConfirmSupplyEditing={onConfirmSupplyEditing}
                  onDeleteSupplyRow={onDeleteSupplyRow}
                />
              ))}
              {pendingNewSupply && (
                <NewSupplyRow
                  item={item}
                  draft={pendingNewSupply}
                  supplierOptions={supplierOptions}
                  isLoadingSuppliers={isLoadingSuppliers}
                  onNewSupplierInputChange={onNewSupplierInputChange}
                  onCancelAddSupplierRow={onCancelAddSupplierRow}
                  onConfirmAddSupplierRow={onConfirmAddSupplierRow}
                />
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
