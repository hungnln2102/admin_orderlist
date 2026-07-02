export const buildNextLabel = (baseLabel: string, usedLabels: string[]) => {
  const used = new Set(
    usedLabels
      .map((label) => String(label || "").trim().toLowerCase())
      .filter(Boolean)
  );
  if (!used.has(baseLabel.toLowerCase())) return baseLabel;
  let suffix = 2;
  while (used.has(`${baseLabel} ${suffix}`.toLowerCase())) {
    suffix += 1;
  }
  return `${baseLabel} ${suffix}`;
};

export const uniqueSortedLabels = (labels: string[]) => {
  const seen = new Set<string>();
  return labels
    .map((name) => String(name || "").trim())
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) =>
      left.localeCompare(right, "vi", { sensitivity: "base" })
    );
};

export const includeCurrentLabel = (options: string[], currentLabel: string) => {
  const current = currentLabel.trim();
  if (!current) return options;
  const exists = options.some(
    (option) => option.toLowerCase() === current.toLowerCase()
  );
  return exists ? options : [current, ...options];
};

export const getPackageOptionsForProduct = (
  productPackageOptionsByName: Record<string, string[]>,
  productName: string
) => {
  const currentProductName = productName.trim().toLowerCase();
  if (!currentProductName) return [] as string[];
  const matchedEntry = Object.entries(productPackageOptionsByName).find(
    ([name]) => name.trim().toLowerCase() === currentProductName
  );
  return uniqueSortedLabels(matchedEntry?.[1] ?? []);
};

export const getFirstPackageForProduct = (
  productPackageOptionsByName: Record<string, string[]>,
  productName: string
) =>
  getPackageOptionsForProduct(productPackageOptionsByName, productName).find(
    Boolean
  ) || "";
