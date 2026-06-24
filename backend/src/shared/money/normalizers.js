const parseIntegerVndAmount = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  const numeric = Number.parseFloat(cleaned || "0");
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
};

const normalizeIntegerVndAmount = (value) => parseIntegerVndAmount(value);

const normalizeNonNegativeIntegerVndAmount = (value) =>
  Math.max(0, parseIntegerVndAmount(value));

module.exports = {
  normalizeIntegerVndAmount,
  normalizeNonNegativeIntegerVndAmount,
};
