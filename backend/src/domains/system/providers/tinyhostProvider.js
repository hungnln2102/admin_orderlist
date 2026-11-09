const { requestProviderApi } = require("./providerRequest");
const { providerConfig } = require("./providerConfig");
const { extractOtpCode, parseJsonResponse, appendQuery } = require("./otpProviderUtils");

async function fetchOtpFromTinyHost(email, { config: configuredConfig, includeDetails = false } = {}) {
  const [user, domain] = String(email || "").split("@");
  if (!user || !domain) throw new Error("Email không hợp lệ để tra cứu TinyHost.");
  const config = configuredConfig || providerConfig("tinyhost");
  const timeoutMs = Number(config.auth_config?.timeoutMs) || 15_000;
  const listPath = config.endpoints?.list || "/api/email/{domain}/{user}/";
  const listEndpoint = appendQuery(listPath.replace("{domain}", encodeURIComponent(domain)).replace("{user}", encodeURIComponent(user)), { limit: "10" });
  const response = await requestProviderApi(config, { endpoint: listEndpoint, timeoutMs });
  if (!response.ok) throw new Error("TinyHost returned HTTP " + response.status + ".");
  const data = await parseJsonResponse(response) || {};
  let foundCode = null;
  for (const item of data.emails || []) {
    foundCode = extractOtpCode(item.subject);
    if (foundCode) break;
    const detailPath = config.endpoints?.detail || "/api/email/{domain}/{user}/{id}";
    const detailEndpoint = detailPath.replace("{domain}", encodeURIComponent(domain)).replace("{user}", encodeURIComponent(user)).replace("{id}", encodeURIComponent(item.id));
    const detailResponse = await requestProviderApi(config, { endpoint: detailEndpoint, timeoutMs });
    if (!detailResponse.ok) continue;
    const detail = await parseJsonResponse(detailResponse);
    foundCode = extractOtpCode(detail?.body || detail?.html_body);
    if (foundCode) break;
  }
  return includeDetails ? { otp: foundCode, rawData: data } : foundCode;
}
module.exports = { fetchOtpFromTinyHost };
