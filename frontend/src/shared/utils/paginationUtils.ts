/**
 * Helper tính toán danh sách số trang và dấu ba chấm cho phân trang (TablePagination)
 * 
 * Quy tắc phân loại (Chỉ đạo của Master):
 * - Luôn có các mốc đầu: 1, 2
 * - Luôn có các mốc cuối: N-2, N-1, N
 * - Vùng giữa quanh trang hiện tại: P-1, P, P+1
 * - Tự động chèn "..." nếu khoảng cách > 1
 * 
 * Ví dụ:
 * - P = 1, N = 16: [1, 2, 3, 4, "...", 14, 15, 16]
 * - P = 7, N = 16: [1, 2, "...", 6, 7, 8, "...", 14, 15, 16]
 * - P = 16, N = 16: [1, 2, "...", 13, 14, 15, 16]
 * - N <= 8: [1, 2, 3, 4, 5, 6, 7, 8]
 */
export function getPaginationRange(currentPage: number, totalPages: number): (number | "...")[] {
  const safeTotalPages = Math.max(1, Math.trunc(Number(totalPages) || 1));
  const safeCurrentPage = Math.max(1, Math.min(safeTotalPages, Math.trunc(Number(currentPage) || 1)));

  // Nếu tổng số trang nhỏ (<= 8), hiển thị tất cả không cần dấu ba chấm
  if (safeTotalPages <= 8) {
    return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
  }

  const pageSet = new Set<number>();

  // 1. Luôn thêm các mốc đầu: 1, 2
  pageSet.add(1);
  pageSet.add(2);

  // Mở rộng mốc đầu nếu đang ở trang đầu
  if (safeCurrentPage <= 4) {
    pageSet.add(3);
    pageSet.add(4);
  }

  // 2. Thêm cụm trang hiện tại và 2 bên: P - 1, P, P + 1
  for (let i = safeCurrentPage - 1; i <= safeCurrentPage + 1; i++) {
    if (i >= 1 && i <= safeTotalPages) {
      pageSet.add(i);
    }
  }

  // 3. Mở rộng mốc cuối nếu đang ở gần cuối
  if (safeCurrentPage >= safeTotalPages - 3) {
    pageSet.add(safeTotalPages - 3);
  }

  // Luôn thêm các mốc cuối: N-2, N-1, N
  pageSet.add(safeTotalPages - 2);
  pageSet.add(safeTotalPages - 1);
  pageSet.add(safeTotalPages);

  // 4. Sắp xếp danh sách
  const sorted = Array.from(pageSet).sort((a, b) => a - b);
  const result: (number | "...")[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const diff = sorted[i] - sorted[i - 1];
      if (diff === 2) {
        // Khoảng cách chỉ là 1 số thì chèn số đó vào luôn thay vì "..."
        result.push(sorted[i - 1] + 1);
      } else if (diff > 2) {
        result.push("...");
      }
    }
    result.push(sorted[i]);
  }

  return result;
}

