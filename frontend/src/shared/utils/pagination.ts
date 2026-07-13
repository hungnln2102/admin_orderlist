export function getPaginated<T>(
  items: T[],
  currentPage: number,
  rowsPerPage: number
): { currentItems: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentItems = items.slice(indexOfFirstRow, indexOfLastRow);
  return { currentItems, totalPages };
}

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
