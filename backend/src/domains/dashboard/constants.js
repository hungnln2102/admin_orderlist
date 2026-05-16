const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

const timezoneCandidate =
  typeof process.env.APP_TIMEZONE === "string" &&
  /^[A-Za-z0-9_\/+\-]+$/.test(process.env.APP_TIMEZONE)
    ? process.env.APP_TIMEZONE
    : DEFAULT_TIMEZONE;

module.exports = {
  DEFAULT_TIMEZONE,
  timezoneCandidate,
};
