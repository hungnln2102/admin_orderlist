const { providerConfig, isProviderConfigured } = require("./providerConfig");
const { getProviderDisplayName } = require("../services/systemConfigService");

const PROVIDER_KEYS = ["tinyhost", "ades", "fix_ades_status", "yuna_check", "yuna_otp", "vivarocky_household", "vivarocky_six_digit", "vivarocky_signin", "totp", "warehouse_2fa", "package_warehouse", "imap"];

function listProviderCatalog() {
  return PROVIDER_KEYS.map(getProviderCatalogEntry);
}

function getProviderCatalogEntry(key) {
  const provider = providerConfig(key);
  const configured = isProviderConfigured(key);
  return { key: provider.service_key, name: getProviderDisplayName(provider.service_key), category: provider.category, description: provider.description, input: key === "totp" ? "secret" : key === "package_warehouse" ? "activation_key" : key === "yuna_check" || key === "warehouse_2fa" ? "email_or_order" : "email", enabled: configured, configured, status: configured ? "READY" : "NOT_CONFIGURED" };
}

function getProviderConfig(key) { return providerConfig(key); }
module.exports = { listProviderCatalog, getProviderCatalogEntry, getProviderConfig, PROVIDER_KEYS };
