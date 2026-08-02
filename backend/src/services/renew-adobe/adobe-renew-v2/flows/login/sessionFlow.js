const DEFAULT_COOKIE_EXPIRY_DAYS = 3;

function toPwCookies(cookies) {
  const now = Math.floor(Date.now() / 1000);
  const defaultExpiry = now + DEFAULT_COOKIE_EXPIRY_DAYS * 24 * 3600;
  return (cookies || [])
    .filter((c) => c.name && c.domain)
    .filter((c) => {
      const exp = c.expirationDate ?? defaultExpiry;
      return exp > now;
    })
    .map((c) => {
      const expires = c.expirationDate && c.expirationDate > 0 ? c.expirationDate : defaultExpiry;
      return {
        name: c.name,
        value: c.value || "",
        domain: c.domain,
        path: c.path || "/",
        expires,
        httpOnly: !!c.httpOnly,
        secure: c.secure !== false,
        sameSite: (c.sameSite || "Lax").toString() === "None" ? "None" : "Lax",
      };
    });
}

function fromPwCookies(cookies) {
  const now = Math.floor(Date.now() / 1000);
  const defaultExpiry = now + DEFAULT_COOKIE_EXPIRY_DAYS * 24 * 3600;
  return (cookies || []).map((c) => {
    const isSession = !c.expires || c.expires <= 0;
    const expirationDate = c.expires > 0 ? c.expires : defaultExpiry;
    return {
      name: c.name,
      value: c.value || "",
      domain: c.domain,
      path: c.path || "/",
      httpOnly: !!c.httpOnly,
      secure: !!c.secure,
      sameSite: c.sameSite || "Lax",
      expirationDate,
      session: isSession,
    };
  });
}

async function exportCookies(context, { includeWithExpiry = false } = {}) {
  const rawCookies = await context.cookies();
  const cookies = fromPwCookies(rawCookies);
  const withExpiry = includeWithExpiry
    ? cookies.filter((c) => c.expirationDate && c.expirationDate > Math.floor(Date.now() / 1000)).length
    : null;
  return { cookies, withExpiry };
}

async function detectSessionValid(page, waitMs = 5000) {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const urlNow = page.url() || "";
    const onAuthUrl = urlNow.includes("auth.services") || urlNow.includes("adobelogin.com") || urlNow.includes("auth.");
    if (onAuthUrl) return false;

    // Chạy single evaluate để kiểm tra trạng thái DOM trong 1 roundtrip duy nhất
    const state = await page.evaluate(() => {
      const getVisible = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const s = window.getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
      };
      if (
        getVisible('input[name="username"], input[type="email"], input[name="email"]') ||
        getVisible('input[type="password"], input#password')
      ) {
        return "login";
      }
      if (getVisible('button[data-testid="org-switch-button"]')) {
        return "org";
      }
      return "unknown";
    }).catch(() => "unknown");

    if (state === "login") return false;
    if (state === "org") return true;

    await page.waitForTimeout(250);
  }

  return false;
}

module.exports = {
  DEFAULT_COOKIE_EXPIRY_DAYS,
  toPwCookies,
  fromPwCookies,
  exportCookies,
  detectSessionValid,
};
