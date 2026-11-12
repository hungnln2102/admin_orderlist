const { requestProviderApi } = require("./providerRequest");
const { parseJsonResponse } = require("./otpProviderUtils");

async function fetchFixAdesStatus(email, { config } = {}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("Invalid email for Fix-Ades status lookup.");
  if (!config) throw new Error("Fix-Ades provider configuration is missing.");

  const response = await requestProviderApi(config, {
    method: "POST",
    endpoint: config.endpoints?.user_status || "/api/user-status",
    body: { email: cleanEmail },
    timeoutMs: Number(config.auth_config?.timeoutMs) || 12_000,
  });
  if (!response.ok) throw new Error(`Fix-Ades returned HTTP ${response.status}.`);

  const rawData = await parseJsonResponse(response);
  if (!rawData || typeof rawData !== "object") throw new Error("Fix-Ades returned an invalid status response.");
  return { rawData, error: rawData.found === false ? String(rawData.error || "No subscription found for this email") : null };
}

async function switchOrgAdes(email, { config } = {}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("Invalid email for Fix-Ades org-switch.");
  if (!config) throw new Error("Fix-Ades provider configuration is missing.");

  const response = await requestProviderApi(config, {
    method: "POST",
    endpoint: config.endpoints?.org_switch || "/api/credits-pool/public/org-switch",
    body: { email: cleanEmail },
    timeoutMs: Number(config.auth_config?.timeoutMs) || 15_000,
  });
  if (!response.ok) throw new Error(`Fix-Ades org-switch returned HTTP ${response.status}.`);

  const rawData = await parseJsonResponse(response);
  if (!rawData || typeof rawData !== "object") throw new Error("Fix-Ades returned an invalid org-switch response.");
  return rawData;
}

async function getSwitchOrgStatusAdes(email, { config } = {}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("Invalid email for Fix-Ades org-switch status.");
  if (!config) throw new Error("Fix-Ades provider configuration is missing.");

  const response = await requestProviderApi(config, {
    method: "POST",
    endpoint: config.endpoints?.org_switch_status || "/api/credits-pool/public/org-switch/status",
    body: { email: cleanEmail },
    timeoutMs: Number(config.auth_config?.timeoutMs) || 15_000,
  });
  if (!response.ok) throw new Error(`Fix-Ades org-switch status returned HTTP ${response.status}.`);

  const rawData = await parseJsonResponse(response);
  if (!rawData || typeof rawData !== "object") throw new Error("Fix-Ades returned an invalid status response.");
  return rawData;
}

module.exports = {
  fetchFixAdesStatus,
  switchOrgAdes,
  getSwitchOrgStatusAdes,
};
