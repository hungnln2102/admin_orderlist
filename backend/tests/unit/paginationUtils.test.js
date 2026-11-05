const test = require("node:test");
const assert = require("node:assert/strict");

function getPaginationRange(currentPage, totalPages) {
  const safeTotalPages = Math.max(1, Math.trunc(Number(totalPages) || 1));
  const safeCurrentPage = Math.max(1, Math.min(safeTotalPages, Math.trunc(Number(currentPage) || 1)));

  if (safeTotalPages <= 8) {
    return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
  }

  const pageSet = new Set();
  pageSet.add(1);
  pageSet.add(2);

  if (safeCurrentPage <= 4) {
    pageSet.add(3);
    pageSet.add(4);
  }

  for (let i = safeCurrentPage - 1; i <= safeCurrentPage + 1; i++) {
    if (i >= 1 && i <= safeTotalPages) {
      pageSet.add(i);
    }
  }

  if (safeCurrentPage >= safeTotalPages - 3) {
    pageSet.add(safeTotalPages - 3);
  }

  pageSet.add(safeTotalPages - 2);
  pageSet.add(safeTotalPages - 1);
  pageSet.add(safeTotalPages);

  const sorted = Array.from(pageSet).sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const diff = sorted[i] - sorted[i - 1];
      if (diff === 2) {
        result.push(sorted[i - 1] + 1);
      } else if (diff > 2) {
        result.push("...");
      }
    }
    result.push(sorted[i]);
  }

  return result;
}

test.describe("TablePagination Range Algorithm Suite - Chỉ Đạo Của Master", () => {
  test("1. Khi ở trang giữa P = 7, tổng N = 16: Phải hiển thị 1, 2, '...', 6, 7, 8, '...', 14, 15, 16 (Đúng ví dụ Master)", () => {
    const pages = getPaginationRange(7, 16);
    assert.deepStrictEqual(pages, [1, 2, "...", 6, 7, 8, "...", 14, 15, 16]);
  });

  test("2. Khi ở trang đầu P = 1, tổng N = 16: Phải hiển thị 1, 2, 3, 4, '...', 14, 15, 16", () => {
    const pages = getPaginationRange(1, 16);
    assert.deepStrictEqual(pages, [1, 2, 3, 4, "...", 14, 15, 16]);
  });

  test("3. Khi ở trang cuối P = 16, tổng N = 16: Phải hiển thị 1, 2, '...', 13, 14, 15, 16", () => {
    const pages = getPaginationRange(16, 16);
    assert.deepStrictEqual(pages, [1, 2, "...", 13, 14, 15, 16]);
  });

  test("4. Khi ở trang cận đầu P = 5, tổng N = 16: Tự động lấp đầy khoảng cách ngắn, không để ... kỳ dị", () => {
    const pages = getPaginationRange(5, 16);
    assert.deepStrictEqual(pages, [1, 2, 3, 4, 5, 6, "...", 14, 15, 16]);
  });

  test("5. Khi tổng số trang nhỏ N = 6 (<= 8): Hiển thị tất cả 1..6 không có dấu ...", () => {
    const pages = getPaginationRange(3, 6);
    assert.deepStrictEqual(pages, [1, 2, 3, 4, 5, 6]);
  });

  test("6. Xử lý an toàn khi đầu vào bất thường (totalPages <= 0, trang âm)", () => {
    const pages = getPaginationRange(-5, 0);
    assert.deepStrictEqual(pages, [1]);
  });
});

