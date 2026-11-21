const { COLS } = require("@/db/tables");
const SS = COLS.ACCOUNT_SLOTS;

function slotProviderSettings(payload) {
  const values = {};
  for (const [property, column] of [
    ["otpEnabled", SS.OTP_ENABLED],
    ["statusCheckEnabled", SS.STATUS_CHECK_ENABLED],
  ]) {
    if (payload[property] === undefined) continue;
    if (typeof payload[property] !== "boolean") throw new TypeError(`Invalid ${property}`);
    values[column] = payload[property];
  }
  for (const [property, column] of [
    ["providerKey", SS.PROVIDER_KEY],
    ["statusProviderKey", SS.STATUS_PROVIDER_KEY],
  ]) {
    if (payload[property] !== undefined) values[column] = String(payload[property] ?? "").trim() || null;
  }
  return values;
}

module.exports = { slotProviderSettings };
