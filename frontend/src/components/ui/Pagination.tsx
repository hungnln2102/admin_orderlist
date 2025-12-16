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

  const startItem = totalItems === 0 ? 0 : (clampedCurrent - 1) * safePageSize + 1;
  const endItem = Math.min(clampedCurrent * safePageSize, totalItems);

  const pages = buildPageList(totalPages, clampedCurrent);

  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm ${className}`}
    >
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 rounded bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40"
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
        >
          {"<<"}
        </button>
        <button
          className="px-2 py-1 rounded bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40"
          onClick={() => onPageChange(clampedCurrent - 1)}
          disabled={!canPrev}
        >
          {"<"}
        </button>
        <div className="flex items-center gap-1">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-white/50">
                ...
              </span>
            ) : (
              <button
                key={p}
                className={`px-3 py-1 rounded font-semibold transition ${
                  p === clampedCurrent
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-white/80 hover:bg-white/10"
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
          className="px-2 py-1 rounded bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40"
          onClick={() => onPageChange(clampedCurrent + 1)}
          disabled={!canNext}
        >
          {">"}
        </button>
        <button
          className="px-2 py-1 rounded bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40"
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
