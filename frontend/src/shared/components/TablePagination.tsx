import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPaginationRange } from "../utils/paginationUtils";

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  totalItems?: number;
  itemName?: string;
  disabled?: boolean;
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize = 15,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 20, 50, 100],
  totalItems,
  itemName = "mục",
  disabled = false,
  className = "",
}) => {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeCurrentPage = Math.max(1, Math.min(safeTotalPages, Number(currentPage) || 1));
  const pages = getPaginationRange(safeCurrentPage, safeTotalPages);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-xs text-slate-400 select-none ${className}`}
    >
      {/* Góc Bên Trái: Dropdown số lượng dòng & Thống kê tổng */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-400">Hiển thị</span>
        {onPageSizeChange ? (
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              if (onPageSizeChange) onPageSizeChange(newSize);
            }}
            disabled={disabled}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 hover:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-slate-900 text-slate-200">
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-bold text-slate-200 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
            {pageSize}
          </span>
        )}
        <span className="text-slate-400">dòng / trang</span>

        {/* Thông tin số trang và tổng số bản ghi */}
        <span className="text-slate-500 pl-1">
          (Trang <strong className="text-slate-200 font-bold">{safeCurrentPage}</strong> / {safeTotalPages}
          {totalItems !== undefined && (
            <>
              {" "}· Tổng <strong className="text-cyan-400 font-bold">{totalItems.toLocaleString("vi-VN")}</strong> {itemName}
            </>
          )}
          )
        </span>
      </div>

      {/* Góc Bên Phải: Nút phân trang thông minh chuẩn Master */}
      <div className="flex items-center gap-1.5">
        {/* Nút Trước */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1 || disabled}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Trước</span>
        </button>

        {/* Dãy nút số trang kèm ellipsis */}
        <div className="flex items-center gap-1 px-1">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="w-7 h-7 flex items-center justify-center text-slate-500 font-bold text-xs select-none tracking-widest"
              >
                ...
              </span>
            ) : (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={disabled}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                  p === safeCurrentPage
                    ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                    : "bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
                title={`Chuyển tới trang ${p}`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Nút Sau */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= safeTotalPages || disabled}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          title="Trang sau"
        >
          <span>Sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

