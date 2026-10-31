import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Link2,
  ExternalLink,
  Copy,
  Check,
  LayoutGrid,
  Table as TableIcon,
  Globe,
  Package,
} from "lucide-react";
import { ServiceNameCategoryItem } from "../types";

interface WarehouseCatalogGridProps {
  catalogItems: ServiceNameCategoryItem[];
  onOpenCreateCatalog: () => void;
  onEditCatalog: (item: ServiceNameCategoryItem) => void;
  onDeleteCatalog?: (item: ServiceNameCategoryItem) => void;
  onOpenBrowserWithUrl?: (url: string, serviceName: string) => void;
}

export const WarehouseCatalogGrid: React.FC<WarehouseCatalogGridProps> = ({
  catalogItems,
  onOpenCreateCatalog,
  onEditCatalog,
  onDeleteCatalog,
  onOpenBrowserWithUrl,
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const getCleanUrl = (url?: string | null) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `https://${url}`;
  };

  const getDisplayUrl = (url?: string | null) => {
    if (!url) return "";
    try {
      const parsed = new URL(getCleanUrl(url));
      const path = parsed.pathname !== "/" ? parsed.pathname : "";
      return parsed.hostname + path;
    } catch {
      return url;
    }
  };

  const handleCopy = (id: number, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenLink = (url: string, serviceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const clean = getCleanUrl(url);
    if (onOpenBrowserWithUrl) {
      onOpenBrowserWithUrl(clean, serviceName);
    } else {
      window.open(clean, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Danh Mục Tên Dịch Vụ Kho</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
              {catalogItems.length} dịch vụ
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cấu hình link đăng nhập cho từng dịch vụ và theo dõi tồn kho tự động
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          {/* VIEW MODE TOGGLE BUTTONS */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow"
                  : "hover:text-white"
              }`}
              title="Xem dạng Lưới Thẻ (Grid Cards)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow"
                  : "hover:text-white"
              }`}
              title="Xem dạng Bảng (Table List)"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenCreateCatalog}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all shrink-0 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Dịch Vụ Mới</span>
          </button>
        </div>
      </div>

      {/* MODE 1: DẠNG LƯỚI THẺ (GRID CARDS) */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogItems.map((cat) => {
            const total = cat.totalAccounts ?? cat.totalSlots ?? ((cat.inStockAccounts ?? cat.inStockSlots ?? 0) + (cat.reservedAccounts ?? cat.reservedSlots ?? 0));
            const isEmptyStock = total === 0;
            const hasLink = Boolean(cat.loginUrl && cat.loginUrl.trim());
            const isCopied = copiedId === cat.id;

            return (
              <div
                key={cat.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 backdrop-blur-xl transition-all shadow-xl space-y-3.5 min-w-0 overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* HEADER THẺ: TÊN DỊCH VỤ & STATUS */}
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className="font-bold text-white text-sm sm:text-base truncate block"
                          title={cat.name}
                        >
                          {cat.name}
                        </h4>
                        {cat.systemProductName && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold shrink-0"
                            title={`Liên kết sản phẩm hệ thống: ${cat.systemProductName}`}
                          >
                            <Package className="w-3 h-3 text-cyan-400" />
                            <span>{cat.systemProductName}</span>
                          </span>
                        )}
                      </div>
                      <span
                        className="text-xs text-slate-400 font-medium truncate block"
                        title={cat.category}
                      >
                        {cat.category}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                        cat.status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : cat.status === "LOW_STOCK"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-red-500/15 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {cat.status === "ACTIVE"
                        ? "Sẵn hàng"
                        : cat.status === "LOW_STOCK"
                        ? "Sắp hết hàng"
                        : "Hết hàng"}
                    </span>
                  </div>

                  {/* CỘT LINK DỊCH VỤ TRÊN THẺ */}
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Globe className={`w-3.5 h-3.5 shrink-0 ${hasLink ? "text-cyan-400" : "text-slate-500"}`} />
                      {hasLink ? (
                        <span
                          className="font-mono text-cyan-300 text-[11px] truncate block select-all cursor-pointer hover:underline"
                          onClick={(e) => handleOpenLink(cat.loginUrl!, cat.name, e)}
                          title={`Bấm để mở: ${cat.loginUrl}`}
                        >
                          {getDisplayUrl(cat.loginUrl)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          Chưa cấu hình link
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {hasLink ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(cat.id, cat.loginUrl!, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                            title="Sao chép link đăng nhập"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenLink(cat.loginUrl!, cat.name, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                            title="Mở trình duyệt cho dịch vụ này"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEditCatalog(cat)}
                          className="text-[10px] text-purple-400 hover:text-purple-300 hover:underline cursor-pointer"
                        >
                          + Gán link
                        </button>
                      )}
                    </div>
                  </div>

                  {/* THỐNG KÊ TỒN KHO */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                      <span className="text-slate-400 block text-[11px]">TỔNG SỐ LƯỢNG</span>
                      <span className="text-sm sm:text-base font-bold text-blue-400">{total} Tài khoản</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                      <span className="text-slate-400 block text-[11px]">CHƯA SỬ DỤNG</span>
                      <span className="text-sm sm:text-base font-bold text-emerald-400">{cat.inStockSlots} Tài khoản</span>
                    </div>
                  </div>
                </div>

                {/* THAO TÁC (SỬA, XÓA) */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                  {onDeleteCatalog && (
                    isEmptyStock ? (
                      <button
                        onClick={() => onDeleteCatalog(cat)}
                        title="Xóa dịch vụ khỏi danh mục (Kho đang trống 0 tài khoảns)"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        title={`Không thể xóa: Kho vẫn còn ${total} tài khoản. Kho phải trống hoàn toàn (0 tài khoản) mới có thể xóa.`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/40 text-slate-600 border border-slate-800/60 transition-all cursor-not-allowed opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    )
                  )}
                  <button
                    onClick={() => onEditCatalog(cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                    title="Chỉnh sửa tên, chuyên mục và cấu hình Link"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Sửa</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 2: DẠNG BẢNG (TABLE LIST) VỚI CỘT LINK TRỰC QUAN */}
      {viewMode === "table" && (
        <div className="overflow-x-auto w-full rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-xl">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="bg-slate-950/90 text-[11px] font-bold uppercase tracking-wider text-purple-300/80 border-b border-slate-800">
                <th className="px-4 py-3.5 font-semibold">Tên Dịch Vụ / Gói</th>
                <th className="px-4 py-3.5 font-semibold">Chuyên Mục</th>
                <th className="px-4 py-3.5 font-semibold">Link Đăng Nhập / Quản Trị</th>
                <th className="px-4 py-3.5 font-semibold text-center">Tổng Tài khoản</th>
                <th className="px-4 py-3.5 font-semibold text-center">Chưa Dùng</th>
                <th className="px-4 py-3.5 font-semibold text-center">Trạng Thái</th>
                <th className="px-4 py-3.5 font-semibold text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {catalogItems.map((cat) => {
                const total = cat.totalAccounts ?? cat.totalSlots ?? ((cat.inStockAccounts ?? cat.inStockSlots ?? 0) + (cat.reservedAccounts ?? cat.reservedSlots ?? 0));
                const isEmptyStock = total === 0;
                const hasLink = Boolean(cat.loginUrl && cat.loginUrl.trim());
                const isCopied = copiedId === cat.id;

                return (
                  <tr key={cat.id} className="hover:bg-white/[0.03] transition-colors">
                    {/* TÊN DỊCH VỤ */}
                    <td className="px-4 py-3.5 font-bold text-white text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{cat.name}</span>
                        {cat.systemProductName && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium"
                            title={`Liên kết sản phẩm hệ thống: ${cat.systemProductName}`}
                          >
                            <Package className="w-3 h-3 text-cyan-400" />
                            <span>{cat.systemProductName}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CHUYÊN MỤC */}
                    <td className="px-4 py-3.5 text-slate-400">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-white/5 text-[11px]">
                        {cat.category}
                      </span>
                    </td>

                    {/* CỘT LINK */}
                    <td className="px-4 py-3.5">
                      {hasLink ? (
                        <div className="inline-flex items-center gap-2 max-w-[280px]">
                          <span
                            onClick={(e) => handleOpenLink(cat.loginUrl!, cat.name, e)}
                            className="font-mono text-cyan-300 text-[11px] truncate block select-all cursor-pointer hover:underline"
                            title={cat.loginUrl!}
                          >
                            {getDisplayUrl(cat.loginUrl)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(cat.id, cat.loginUrl!, e)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer shrink-0"
                            title="Sao chép link"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenLink(cat.loginUrl!, cat.name, e)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer shrink-0"
                            title="Mở trình duyệt"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEditCatalog(cat)}
                          className="text-[11px] text-slate-500 hover:text-purple-300 transition-colors italic flex items-center gap-1 cursor-pointer"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>+ Cài link</span>
                        </button>
                      )}
                    </td>

                    {/* TỔNG TÀI KHOẢNS */}
                    <td className="px-4 py-3.5 text-center font-bold text-blue-400">
                      {total}
                    </td>

                    {/* CHƯA DÙNG */}
                    <td className="px-4 py-3.5 text-center font-bold text-emerald-400">
                      {cat.inStockSlots}
                    </td>

                    {/* TRẠNG THÁI */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          cat.status === "ACTIVE"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : cat.status === "LOW_STOCK"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-red-500/15 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {cat.status === "ACTIVE"
                          ? "Sẵn hàng"
                          : cat.status === "LOW_STOCK"
                          ? "Sắp hết"
                          : "Hết hàng"}
                      </span>
                    </td>

                    {/* THAO TÁC */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditCatalog(cat)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-all cursor-pointer"
                          title="Sửa thông tin và link"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        {onDeleteCatalog && (
                          isEmptyStock ? (
                            <button
                              type="button"
                              onClick={() => onDeleteCatalog(cat)}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
                              title="Xóa dịch vụ (Kho đang trống 0 tài khoản)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 rounded-lg text-slate-600 border border-slate-800 cursor-not-allowed opacity-50"
                              title={`Không thể xóa: Kho vẫn còn ${total} tài khoản.`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
