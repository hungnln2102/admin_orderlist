import React from "react";

type PaginationProps = {
  currentPage: number; // 1-based
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const buildPageList = (totalPages: number, currentPage: number) => {
  const pages: (number | "...")[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  const start = clamp(currentPage - 1, 2, totalPages - 3);
  const end = clamp(currentPage + 1, 4, totalPages - 1);

  pages.push(1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
};

export default function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  className = "",
}: PaginationProps) {
  const safePageSize = pageSize > 0 ? pageSize : 10;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const clampedCurrent = clamp(currentPage, 1, totalPages);
  const canPrev = clampedCurrent > 1;
  const canNext = clampedCurrent < totalPages;
  const navButtonClass =
    "w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed";
  const pageButtonClass =
    "w-10 h-10 flex items-center justify-center rounded-xl font-semibold border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition";
  const activePageClass =
    "rounded-full bg-gradient-to-br from-[#323b74] via-[#22294f] to-[#151c39] text-white border border-[#6b74ff]/50 shadow-[0_12px_30px_-14px_rgba(107,116,255,0.8)]";

  const startItem = totalItems === 0 ? 0 : (clampedCurrent - 1) * safePageSize + 1;
  const endItem = Math.min(clampedCurrent * safePageSize, totalItems);

  const pages = buildPageList(totalPages, clampedCurrent);

  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          className={navButtonClass}
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
        >
          {"<<"}
        </button>
        <button
          className={navButtonClass}
          onClick={() => onPageChange(clampedCurrent - 1)}
          disabled={!canPrev}
        >
          {"<"}
        </button>
        <div className="flex items-center gap-1.5">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="w-10 h-10 flex items-center justify-center text-white/50"
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                className={`${pageButtonClass} ${
                  p === clampedCurrent ? activePageClass : ""
                }`}
                onClick={() => onPageChange(p)}
                disabled={p === clampedCurrent}
              >
                {p}
              </button>
            )
          )}
        </div>
        <button
          className={navButtonClass}
          onClick={() => onPageChange(clampedCurrent + 1)}
          disabled={!canNext}
        >
          {">"}
        </button>
        <button
          className={navButtonClass}
          onClick={() => onPageChange(totalPages)}
          disabled={!canNext}
        >
          {">>"}
        </button>
      </div>
      <div className="text-white/70">
        {totalItems === 0
          ? "0 mục"
          : `${startItem}-${endItem} trong ${totalItems}`}
      </div>
    </div>
  );
}
