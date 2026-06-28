import type { Order } from "@/constants";

/** C?t trang t? danh s?ch ?? l?c. */
export function getPaginated(
  filteredOrders: Order[],
  currentPage: number,
  rowsPerPage: number
): { currentOrders: Order[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstRow, indexOfLastRow);
  return { currentOrders, totalPages };
}

/** Sinh danh s?ch s? trang + d?u "..." cho UI ph?n trang. */
export function buildPaginationPages(
  currentPage: number,
  totalPages: number
): (number | "...")[] {
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);
  const start = clamp(currentPage - 1, 2, totalPages - 3);
  const end = clamp(currentPage + 1, 4, totalPages - 1);
  pages.push(1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
}
