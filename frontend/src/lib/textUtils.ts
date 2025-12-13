export const stripHtmlTags = (value?: string | null): string => {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&[^;\s]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

interface NormalizeOptions {
  fallback?: string;
  blockPatterns?: RegExp[];
}

export const normalizeErrorMessage = (
  raw?: string | null,
  options: NormalizeOptions = {}
): string => {
  const { fallback = "Đã xảy ra lỗi. Vui lòng thử lại sau.", blockPatterns } =
    options;
  const normalized = stripHtmlTags(raw);
  if (!normalized) return fallback;
  if (
    Array.isArray(blockPatterns) &&
    blockPatterns.some((pattern) => pattern.test(normalized))
  ) {
    return fallback;
  }
  return normalized;
};
