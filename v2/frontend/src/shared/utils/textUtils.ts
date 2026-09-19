/**
 * textUtils.ts - Utility helper xử lý định dạng & cắt ngắn văn bản chuẩn UX
 */

/**
 * Cắt ngắn văn bản nếu vượt quá độ dài quy định (mặc định 12 ký tự) và nối dấu "..." ở cuối.
 * 
 * @param str Chuỗi văn bản đầu vào
 * @param maxLength Độ dài ký tự tối đa cho phép (mặc định: 12)
 * @returns Chuỗi văn bản đã được cắt bớt
 */
export function truncateText(
  str: string | null | undefined,
  maxLength: number = 12
): string {
  if (!str) return "—";
  const trimmed = String(str).trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).trimEnd() + "...";
}
