export const stripVietnameseDiacritics = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export const normalizeSearchText = (value: unknown): string =>
  stripVietnameseDiacritics(value).toLowerCase().trim();

export const normalizeCompactCode = (value: unknown): string =>
  normalizeSearchText(value).replace(/[^a-z0-9]/g, "");
