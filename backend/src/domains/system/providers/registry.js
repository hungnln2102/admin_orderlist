const { providerConfig, isProviderConfigured } = require("./providerConfig");

const PROVIDER_KEYS = ["tinyhost", "ades", "yuna_2fa", "yuna_mail", "vivarocky_household", "vivarocky_six_digit", "vivarocky_signin", "totp", "warehouse_2fa", "imap"];

function listProviderCatalog() {
  return PROVIDER_KEYS.map((key) => {
    const provider = providerConfig(key);
    const configured = isProviderConfigured(key);
    return { key: provider.service_key, name: provider.service_name, category: provider.category, description: provider.description, input: key === "totp" ? "secret" : key === "yuna_2fa" || key === "warehouse_2fa" ? "email_or_order" : "email", enabled: configured, configured, status: configured ? "READY" : "NOT_CONFIGURED" };
  });
}

function getProviderConfig(key) { return providerConfig(key); }
module.exports = { listProviderCatalog, getProviderConfig, PROVIDER_KEYS };
