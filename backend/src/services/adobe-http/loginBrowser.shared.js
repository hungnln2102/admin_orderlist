const PASSWORD_SELECTORS = [
  'input[name="password"]',
  'input[type="password"]',
  "input#password",
  'input[data-testid="password-field"]',
];

const SKIP_RE = /^\s*(not now|skip|bỏ qua|later|skip for now)\s*$/i;

function isOnAdobeSite(url) {
  return (
    url.includes("@AdobeOrg") ||
    (url.includes("adminconsole.adobe.com") && !url.includes("auth.services")) ||
    (url.includes("adobe.com/home") && !url.includes("auth.services"))
  );
}

function extractOrgIdFromUrl(url) {
  if (!url || typeof url !== "string") {
    return null;
  }
  const match = url.match(/\/([A-Fa-f0-9]{20,})@AdobeOrg/);
  return match ? match[1] : null;
}

async function extractTokenFromPage(page) {
  await page.waitForTimeout(2000).catch(() => {});

  try {
    const hash = await page.evaluate(() => window.location.hash).catch(() => "");
    const match = hash.match(/access_token=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  } catch (_) {}

  try {
    return await page
      .evaluate(() => {
        const keys = [
          "adobeid_ims_access_token",
          "AdobeID_ims_access_token",
          "feds_access_token",
          "ims_token",
          "adobe_com_adobe_redux",
        ];
        for (const key of keys) {
          const value =
            window.localStorage.getItem(key) ||
            window.sessionStorage.getItem(key);
          if (value && value.length > 20) {
            if (key === "adobe_com_adobe_redux") {
              try {
                const parsed = JSON.parse(value);
                const token =
                  parsed?.session?.token?.access_token ||
                  parsed?.ims?.token?.access_token;
                if (token && token.length > 20) {
                  return token;
                }
              } catch (_) {}
            } else {
              return value;
            }
          }
        }

        for (let index = 0; index < window.localStorage.length; index++) {
          const key = window.localStorage.key(index);
          if (/access.?token|ims.*token/i.test(key)) {
            const value = window.localStorage.getItem(key);
            if (value && value.length > 20) {
              return value;
            }
          }
        }
        return null;
      })
      .catch(() => null);
  } catch (_) {
    return null;
  }
}

function normalizeSameSite(sameSite) {
  if (!sameSite) {
    return "Lax";
  }
  const value = String(sameSite).toLowerCase();
  if (value === "strict") {
    return "Strict";
  }
  if (value === "none") {
    return "None";
  }
  return "Lax";
}

function toPwCookies(cookies) {
  const now = Math.floor(Date.now() / 1000);
  return cookies
    .filter((cookie) => cookie.name && cookie.domain)
    .filter((cookie) => !cookie.expirationDate || cookie.expirationDate > now)
    .map((cookie) => ({
      name: cookie.name,
      value: cookie.value || "",
      domain: cookie.domain,
      path: cookie.path || "/",
      expires: cookie.expirationDate ? cookie.expirationDate : -1,
      httpOnly: !!cookie.httpOnly,
      secure: cookie.secure !== false,
      sameSite: normalizeSameSite(cookie.sameSite),
    }));
}

function fromPwCookies(cookies) {
  return cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value || "",
    domain: cookie.domain,
    path: cookie.path || "/",
    httpOnly: !!cookie.httpOnly,
    secure: !!cookie.secure,
    sameSite: cookie.sameSite || "Lax",
    expirationDate: cookie.expires > 0 ? cookie.expires : undefined,
    session: !cookie.expires || cookie.expires <= 0,
  }));
}

module.exports = {
  PASSWORD_SELECTORS,
  SKIP_RE,
  isOnAdobeSite,
  extractOrgIdFromUrl,
  extractTokenFromPage,
  toPwCookies,
  fromPwCookies,
};
