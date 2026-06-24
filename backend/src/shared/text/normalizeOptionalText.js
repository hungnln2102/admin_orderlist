const normalizeOptionalText = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

module.exports = { normalizeOptionalText };
