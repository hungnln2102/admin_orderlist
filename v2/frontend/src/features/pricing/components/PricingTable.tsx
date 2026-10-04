import React from "react";
import {
  Tag,
  Loader2,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Building2,
  PlusCircle,
} from "lucide-react";
import { PricingItem, SupplierCostItem, Supplier, EditingSupplierCostState } from "../types";

interface PricingTableProps {
  items: PricingItem[];
  loading: boolean;
  expandedRowId: number | null;
  toggleExpandRow: (id: number) => void;
  supplierCosts: Record<number, SupplierCostItem[]>;
  loadingSuppliers: Record<number, boolean>;
  allSuppliers: Supplier[];
  formatCurrency: (val: number) => string;
  onOpenEditModal: (item: PricingItem) => void;
  onConfirmDelete: (item: PricingItem) => void;
  onOpenAddSupplierModal: (productId: number) => void;
  onOpenEditSupplierCostModal: (state: EditingSupplierCostState) => void;
  onDeleteSupplierCost: (productId: number, supplierCostId: number) => void;
}

export const PricingTable: React.FC<PricingTableProps> = ({
  items,
  loading,
  expandedRowId,
  toggleExpandRow,
  supplierCosts,
  loadingSuppliers,
  allSuppliers,
  formatCurrency,
  onOpenEditModal,
  onConfirmDelete,
  onOpenAddSupplierModal,
  onOpenEditSupplierCostModal,
  onDeleteSupplierCost,
}) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800/60">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-800/80">
          <tr>
            <th className="py-3.5 px-3 w-8 text-center"></th>
            <th className="py-3.5 px-4">Sản Phẩm</th>
            <th className="py-3.5 px-3 text-right">Giá Gốc</th>
            <th className="py-3.5 px-3 text-right">Giá Bán Lẻ</th>
            <th className="py-3.5 px-3 text-right">Giá CTV</th>
            <th className="py-3.5 px-3 text-right">Giá Sinh Viên</th>
            <th className="py-3.5 px-3 text-right">Giá KM</th>
            <th className="py-3.5 px-3 text-center">Lợi Nhuận</th>
            <th className="py-3.5 px-3 text-center">Trạng Thái</th>
            <th className="py-3.5 px-4 text-center">Thao Tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50 text-slate-300 font-medium">
          {loading ? (
            <tr>
              <td colSpan={10} className="py-12 text-center text-slate-400">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <span className="text-xs">Đang tải dữ liệu bảng giá thực tế...</span>
                </div>
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={10} className="py-12 text-center text-slate-400">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Tag className="w-8 h-8 text-slate-600" />
                  <span className="text-xs font-semibold">Không tìm thấy sản phẩm nào</span>
                  <span className="text-[11px] text-slate-500">Thử thay đổi từ khóa tìm kiếm</span>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isExpanded = expandedRowId === item.id;
              const costs = supplierCosts[item.id] || [];
              const isLoadingCosts = loadingSuppliers[item.id];
              const lowestSupplierCost =
                costs.length > 0 ? Math.min(...costs.map((c) => Number(c.price))) : null;
              const lowestSupplierObj =
                lowestSupplierCost !== null
                  ? costs.find((c) => Number(c.price) === lowestSupplierCost)
                  : null;

              return (
                <React.Fragment key={item.id}>
                  <tr
                    onClick={() => toggleExpandRow(item.id)}
                    className={`transition-colors group cursor-pointer ${
                      isExpanded ? "bg-slate-900/80" : "hover:bg-slate-900/60"
                    }`}
                  >
                    {/* Chevron Expand Icon */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandRow(item.id);
                        }}
                        className={`p-1 rounded-md transition-all ${
                          isExpanded
                            ? "bg-indigo-500/20 text-indigo-400"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                        }`}
                        title={isExpanded ? "Thu gọn danh sách giá NCC" : "Mở rộng danh sách giá NCC"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Product Name & Variant Name */}
                    <td className="py-3.5 px-4 max-w-[220px]">
                      <div>
                        <div
                          className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate"
                          title={item.san_pham}
                        >
                          {item.san_pham}
                        </div>
                        {item.package_product && item.package_product !== item.san_pham && (
                          <div
                            className="text-[11px] text-slate-400 mt-0.5 truncate"
                            title={item.package_product}
                          >
                            {item.package_product}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Base Price */}
                    <td className="py-3.5 px-3 text-right font-medium text-slate-400">
                      {formatCurrency(item.base_price)}
                    </td>

                    {/* Retail Price */}
                    <td className="py-3.5 px-3 text-right font-bold text-cyan-300">
                      {formatCurrency(item.retail_price)}
                    </td>

                    {/* CTV Price */}
                    <td className="py-3.5 px-3 text-right font-semibold text-emerald-400">
                      {formatCurrency(item.ctv_price)}
                    </td>

                    {/* Student Price */}
                    <td className="py-3.5 px-3 text-right font-semibold text-amber-400">
                      {formatCurrency(item.student_price)}
                    </td>

                    {/* Promo Price */}
                    <td className="py-3.5 px-3 text-right font-semibold text-rose-400">
                      {formatCurrency(item.promo_price)}
                    </td>

                    {/* Margin */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {item.margin}
                      </span>
                    </td>

                    {/* Active Status */}
                    <td className="py-3.5 px-3 text-center">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-400 bg-slate-800/60 border border-slate-700/60">
                          <XCircle className="w-3 h-3" />
                          Ẩn
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEditModal(item);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 border border-slate-800 transition-all"
                          title="Sửa sản phẩm & Giá"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onConfirmDelete(item);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 border border-slate-800 transition-all"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Supplier Cost Panel */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={10} className="p-4 bg-slate-950/70 border-b border-slate-800/80">
                        <div className="bg-[#0f172a]/90 border border-indigo-500/20 rounded-xl p-5 shadow-2xl space-y-4">
                          <h3 className="text-center text-xs font-bold text-slate-200 tracking-wide uppercase">
                            Chi tiết giá sản phẩm
                          </h3>

                          {/* 4 Stat Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 text-center shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                GIÁ NGUỒN THẤP NHẤT
                              </div>
                              <div className="text-lg font-black text-cyan-400">
                                {lowestSupplierCost !== null ? formatCurrency(lowestSupplierCost) : "-"}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {lowestSupplierObj ? lowestSupplierObj.supplier_name : "Chưa có NCC"}
                              </div>
                            </div>

                            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 text-center shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                GIÁ SỈ HIỆN TẠI
                              </div>
                              <div className="text-lg font-black text-emerald-400">
                                {formatCurrency(item.ctv_price)}
                              </div>
                            </div>

                            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 text-center shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                GIÁ KHÁCH HIỆN TẠI
                              </div>
                              <div className="text-lg font-black text-sky-400">
                                {formatCurrency(item.retail_price)}
                              </div>
                            </div>

                            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 text-center shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                GIÁ SINH VIÊN
                              </div>
                              <div className="text-lg font-black text-amber-400">
                                {formatCurrency(item.student_price)}
                              </div>
                            </div>
                          </div>

                          {/* Supplier Sub-Table Header */}
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-cyan-400" />
                              Danh Sách Nhà Cung Cấp ({costs.length})
                            </span>
                            <button
                              onClick={() => onOpenAddSupplierModal(item.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all active:scale-95"
                            >
                              <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Thêm nguồn</span>
                            </button>
                          </div>

                          {/* Supplier Sub-Table */}
                          <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/60">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800/80">
                                <tr>
                                  <th className="py-2.5 px-4">NCC</th>
                                  <th className="py-2.5 px-3 text-center">GIÁ NHẬP</th>
                                  <th className="py-2.5 px-3 text-center">LỢI NHUẬN</th>
                                  <th className="py-2.5 px-4 text-center">THAO TÁC</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/40">
                                {isLoadingCosts ? (
                                  <tr>
                                    <td colSpan={4} className="py-4 text-center text-slate-400">
                                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin inline mr-2" />
                                      Đang tải giá nguồn từ các NCC...
                                    </td>
                                  </tr>
                                ) : costs.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="py-4 text-center text-slate-500 italic">
                                      Chưa có dữ liệu giá từ Nhà cung cấp nào
                                    </td>
                                  </tr>
                                ) : (
                                  costs.map((c) => {
                                    const ctvMargin = item.ctv_price > 0 ? item.ctv_price - c.price : 0;
                                    const retailMargin =
                                      item.retail_price > 0 ? item.retail_price - c.price : 0;
                                    const marginText = `${formatCurrency(ctvMargin)} - ${formatCurrency(
                                      retailMargin
                                    )}`;

                                    return (
                                      <tr key={c.id} className="hover:bg-slate-900/40">
                                        <td className="py-3 px-4 font-bold text-slate-200">
                                          {c.supplier_name}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                          <span className="px-3 py-1 rounded-md text-xs font-bold bg-slate-900 border border-slate-800 text-cyan-300">
                                            {formatCurrency(c.price)}
                                          </span>
                                        </td>
                                        <td className="py-3 px-3 text-center font-semibold text-emerald-400">
                                          {marginText}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          <div className="flex items-center justify-center gap-1.5">
                                            <button
                                              onClick={() =>
                                                onOpenEditSupplierCostModal({
                                                  productId: item.id,
                                                  supplierCostId: c.id,
                                                  supplierName: c.supplier_name,
                                                  price: c.price,
                                                })
                                              }
                                              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-all"
                                              title="Sửa giá nhập này"
                                            >
                                              <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => onDeleteSupplierCost(item.id, c.id)}
                                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all"
                                              title="Xóa nhà cung cấp này"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
