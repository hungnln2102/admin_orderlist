/**
 * Re-export Adobe check service (HTTP-only, không dùng Puppeteer).
 */
const adobeHttp = require("./adobe-http");

module.exports = {
  adobeHttp,
};
