const normalizeExactAmount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return num;
};

const normalizeAccount = (value) =>
  String(value ?? "").replace(/\s+/g, "").trim();

module.exports = {
  normalizeAccount,
  normalizeExactAmount,
};
