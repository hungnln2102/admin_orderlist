import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import Pagination from "@/components/ui/Pagination";
import type { ActiveKeyItem } from "../types";
import { ActiveKeyCard } from "./ActiveKeyCard";
import { ActiveKeyRow } from "./ActiveKeyRow";

const PAGE_SIZE = 10;

type ProductSummaryRow = { product: string; keyCount: number };

type ActiveKeysTablePanelProps = {
  activeTab: "keys" | "products";
  currentKeyRows: ActiveKeyItem[];
  currentProductRows: ProductSummaryRow[];
  keyPage: number;
  productPage: number;
  totalKeyItems: number;
  totalProductItems: number;
  startKey: number;
  startProduct: number;
  onTabChange: (tab: "keys" | "products") => void;
  onKeyPageChange: (page: number) => void;
  onProductPageChange: (page: number) => void;
  onView: (item: ActiveKeyItem) => void;
  onEdit: (item: ActiveKeyItem) => void;
};

export function ActiveKeysTablePanel({
  activeTab,
  currentKeyRows,
  currentProductRows,
  keyPage,
  productPage,
  totalKeyItems,
  totalProductItems,
  startKey,
  startProduct,
  onTabChange,
  onKeyPageChange,
  onProductPageChange,
  onView,
  onEdit,
}: ActiveKeysTablePanelProps) {
  return (
      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        <div className="flex border-b border-white/10 bg-white/[0.02]">
          <button
            type="button"
            onClick={() => onTabChange("keys")}
            className={`flex-1 px-4 py-3 text-xs sm:text-sm font-semibold tracking-wide uppercase ${
              activeTab === "keys"
                ? "text-indigo-300 border-b-2 border-indigo-400 bg-white/[0.03]"
                : "text-white/60 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            Danh sách Key
          </button>
          <button
            type="button"
            onClick={() => onTabChange("products")}
            className={`flex-1 px-4 py-3 text-xs sm:text-sm font-semibold tracking-wide uppercase ${
              activeTab === "products"
                ? "text-indigo-300 border-b-2 border-indigo-400 bg-white/[0.03]"
                : "text-white/60 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            Danh sách sản phẩm
          </button>
        </div>

        {activeTab === "keys" ? (
          <>
            <ResponsiveTable
              showCardOnMobile
              cardView={
                currentKeyRows.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-white/70 text-lg mb-2">
                      Không tìm thấy key nào
                    </p>
                    <p className="text-white/60 text-sm">
                      Thử thay đổi từ khóa tìm kiếm
                    </p>
                  </div>
                ) : (
                  <TableCard
                    data={currentKeyRows}
                    renderCard={(item, idx) => (
                      <ActiveKeyCard
                        item={item as ActiveKeyItem}
                        index={startKey + idx + 1}
                        onView={onView}
                        onEdit={onEdit}
                      />
                    )}
                    className="p-4"
                  />
                )
              }
            >
              <table className="min-w-full divide-y divide-white/5 text-white">
                <thead>
                  <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                    <th className="w-12 text-center">STT</th>
                    <th className="min-w-[140px]">MÃ ĐƠN HÀNG</th>
                    <th className="min-w-[160px]">SẢN PHẨM</th>
                    <th className="min-w-[200px]">KEY</th>
                    <th className="min-w-[100px]">THỜI HẠN</th>
                    <th className="w-28 text-right pr-4">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentKeyRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-white/70"
                      >
                        <p className="text-lg mb-2">Không tìm thấy key nào</p>
                        <p className="text-sm text-white/60">
                          Thử thay đổi từ khóa tìm kiếm
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentKeyRows.map((item, i) => (
                      <ActiveKeyRow
                        key={item.id}
                        item={item}
                        index={startKey + i + 1}
                        onView={onView}
                        onEdit={onEdit}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </ResponsiveTable>

            {totalKeyItems > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:px-6">
                <Pagination
                  currentPage={keyPage}
                  totalItems={totalKeyItems}
                  pageSize={PAGE_SIZE}
                  onPageChange={onKeyPageChange}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <ResponsiveTable showCardOnMobile>
              <table className="min-w-full divide-y divide-white/5 text-white">
                <thead>
                  <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                    <th className="w-12 text-center">STT</th>
                    <th className="min-w-[180px]">SẢN PHẨM</th>
                    <th className="min-w-[120px]">SỐ LƯỢNG KEY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentProductRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-12 text-center text-white/70"
                      >
                        <p className="text-lg mb-2">
                          Không tìm thấy sản phẩm nào
                        </p>
                        <p className="text-sm text-white/60">
                          Thử thay đổi từ khóa tìm kiếm
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentProductRows.map((item, index) => (
                      <tr key={item.product}>
                        <td className="px-2 sm:px-4 py-3 text-center text-sm text-white/80">
                          {startProduct + index + 1}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm font-medium text-white">
                          {item.product}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm text-white/80">
                          {item.keyCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ResponsiveTable>

            {totalProductItems > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:px-6">
                <Pagination
                  currentPage={productPage}
                  totalItems={totalProductItems}
                  pageSize={PAGE_SIZE}
                  onPageChange={onProductPageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
  );
}
