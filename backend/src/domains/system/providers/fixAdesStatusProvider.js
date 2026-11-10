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

module.exports = { fetchFixAdesStatus };
