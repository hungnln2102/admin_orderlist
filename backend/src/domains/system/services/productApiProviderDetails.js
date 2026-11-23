const { getProviderConfig } = require("../providers/registry");
const { getProviderDisplayName } = require("./systemConfigService");

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, "");

function providerDetails(providerKey) {
  const provider = getProviderConfig(providerKey);
  if (!provider) return null;
  return {
    service_key: provider.service_key,
    service_name: getProviderDisplayName(provider.service_key),
    category: provider.category,
    description: provider.description || "",
    base_url: provider.base_url || "",
  };
}

module.exports = { normalizeKey, providerDetails };
