/* eslint-disable max-lines */
const express = require("express");

const router = express.Router();

const DEFAULT_COOLDOWN_SECONDS = 30;
const netflixConfig = {
  vivaBaseUrl: process.env.VIVA_BASE_URL || "https://vivarocky.in",
  mainAccessCode: process.env.VIVA_MAIN_CODE || "mvrk56",
  otpAccessCode: process.env.VIVA_OTP_ACCESS_CODE || "mvrk01",
};

function getVivaUrl(path) {
  const base = (netflixConfig.vivaBaseUrl || "https://vivarocky.in").replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

const UPSTREAM_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

/**
 * Danh sách tab config cho Website.
 * Đây là nguồn sự thật (source of truth) cho tab menu động.
 * Thêm/sửa/xóa tab ở đây → Website tự cập nhật mà không cần sửa code Website.
 *
 * resultType: "link" | "code" | "text"
 *   - "link"  → hiển thị nút mở link
 *   - "code"  → hiển thị nút copy code
 *   - "text"  → hiển thị text message
 */
const WEBSITE_TAB_CONFIGS = [
  {
    id: "household",
    label: "Xác minh Hộ gia đình",
    description: "Lấy link xác minh Household Netflix",
    color: "rose",
    apiEndpoint: "/api/netflix/public/household",
    inputLabel: "Email Netflix",
    inputPlaceholder: "example@email.com",
    submitLabel: "Lấy link xác minh",
    resultType: "link",
  },
  {
    id: "otp",
    label: "Mã OTP đăng nhập",
    description: "Lấy mã OTP 4–8 số từ email Netflix",
    color: "amber",
    apiEndpoint: "/api/netflix/public/send-otp",
    inputLabel: "Email Netflix",
    inputPlaceholder: "example@email.com",
    submitLabel: "Lấy mã OTP",
    resultType: "code",
  },
  {
    id: "six-digit",
    label: "Mã 6 số đăng nhập",
    description: "Lấy mã xác minh 6 số (TV login)",
    color: "emerald",
    apiEndpoint: "/api/netflix/public/six-digit-login",
    inputLabel: "Email Netflix",
    inputPlaceholder: "example@email.com",
    submitLabel: "Lấy mã 6 số",
    resultType: "code",
  },
];

// GET /api/netflix/public/tabs — Trả về tab config cho Website render động
router.get("/tabs", (req, res) => {
  return res.json({ ok: true, tabs: WEBSITE_TAB_CONFIGS });
});

// GET /api/netflix/public/config — Trả về cấu hình API hiện tại
router.get("/config", (req, res) => {
  return res.json({ ok: true, data: netflixConfig });
});

// POST /api/netflix/public/config — Cập nhật cấu hình API tại runtime
router.post("/config", (req, res) => {
  const { vivaBaseUrl, mainAccessCode, otpAccessCode } = req.body || {};
  if (vivaBaseUrl !== undefined && vivaBaseUrl.trim()) {
    let cleanUrl = vivaBaseUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }
    netflixConfig.vivaBaseUrl = cleanUrl;
  }
  if (mainAccessCode !== undefined && mainAccessCode.trim()) {
    netflixConfig.mainAccessCode = mainAccessCode.trim();
  }
  if (otpAccessCode !== undefined && otpAccessCode.trim()) {
    netflixConfig.otpAccessCode = otpAccessCode.trim();
  }
  return res.json({
    ok: true,
    message: "Đã cập nhật cấu hình API Netflix VIVA thành công.",
    data: netflixConfig,
  });
});


const stripHtml = (value) =>
  (value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const decodeHrefEntities = (value) =>
  (value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/g, "&")
    .replace(/&#x26;/gi, "&")
    .trim();

function normalizeHouseholdMessage(message) {
  const text = stripHtml(message);

  if (!text) return "";

  if (/no recent email found from this address/i.test(text)) {
    return "Không tìm thấy email gần đây từ địa chỉ này.";
  }

  return text
    .replace(/^error:\s*/i, "")
    .replace(/^success:\s*/i, "")
    .trim();
}

function normalizeOtpMessage(message) {
  const text = stripHtml(message);

  if (!text) return "";

  if (/no recent email found from this address/i.test(text)) {
    return "Không tìm thấy email gần đây từ địa chỉ này.";
  }

  if (/this email is not assigned to you/i.test(text)) {
    return "Email này không được gán cho mã truy cập hiện tại.";
  }

  if (/the access code is invalid/i.test(text)) {
    return "Mã truy cập không hợp lệ.";
  }

  return text
    .replace(/^error:\s*/i, "")
    .replace(/^warning:\s*/i, "")
    .trim();
}

async function postUpstreamForm(url, body) {
  return fetch(url, {
    method: "POST",
    headers: UPSTREAM_HEADERS,
    body: new URLSearchParams(body).toString(),
  });
}

// POST /api/netflix/household
router.post("/household", async (req, res) => {
  const email = (req.body?.email || "").trim();

  if (!email) {
    return res.status(400).json({ ok: false, error: "Missing email" });
  }

  try {
    const upstreamRes = await postUpstreamForm(
      getVivaUrl("/household.php"),
      { email, user_email: email }
    );

    const html = await upstreamRes.text();

    const nftokenMatch = html.match(
      /href=["']([^"']*[?&](?:nftoken|messageGuid)=[^"']+)["']/i
    );
    const buttonTextMatch = html.match(
      /<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]{0,400}?(?:Get\s+Code|Lấy\s+mã|Lay\s+ma)[\s\S]{0,200}?<\/a>/i
    );
    const travelVerifyMatch = html.match(
      /href=["'](https?:\/\/[^"']*\/(?:account\/travel\/verify|travel\/verify)[^"']*)["']/i
    );
    const linkMatch =
      nftokenMatch ||
      buttonTextMatch ||
      travelVerifyMatch ||
      html.match(/href=["'](https?:\/\/[^"']*household[^"']*)["']/i) ||
      html.match(/href=["'](https?:\/\/[^"']*netflix[^"']*)["']/i) ||
      html.match(/window\.location\.href\s*=\s*["'](https?:\/\/[^"']+)["']/i);

    const successMatch = html.match(
      /<div[^>]*class=["'][^"']*success[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );
    const resultMatch = html.match(
      /<div[^>]*class=["'][^"']*result[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );
    const errorMatch = html.match(
      /<div[^>]*class=["'][^"']*error[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );

    if (linkMatch?.[1]) {
      return res.json({
        ok: true,
        link: decodeHrefEntities(linkMatch[1]),
        message: successMatch
          ? normalizeHouseholdMessage(successMatch[1] || "")
          : "Đã tìm thấy liên kết hộ gia đình.",
        cooldown: DEFAULT_COOLDOWN_SECONDS,
      });
    }

    if (successMatch) {
      return res.json({
        ok: true,
        message: normalizeHouseholdMessage(successMatch[1] || ""),
        cooldown: DEFAULT_COOLDOWN_SECONDS,
      });
    }

    if (resultMatch) {
      const text = normalizeHouseholdMessage(resultMatch[1] || "");
      const isError = /lỗi|error|not found|không tìm/i.test(text);

      return res.json({
        ok: !isError,
        message: text,
        cooldown: DEFAULT_COOLDOWN_SECONDS,
      });
    }

    if (errorMatch) {
      return res.json({
        ok: false,
        message: normalizeHouseholdMessage(errorMatch[1] || ""),
        cooldown: DEFAULT_COOLDOWN_SECONDS,
      });
    }

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      const bodyText = stripHtml(bodyMatch[1]);
      const isError = /lỗi|error|không tìm|not found|no.*email|fail/i.test(bodyText);
      const msgMatch = bodyText.match(/((?:Lỗi|Error|Thành công|Success)[^.!]*[.!]?)/i);

      return res.json({
        ok: !isError,
        message: msgMatch
          ? normalizeHouseholdMessage(msgMatch[1] || "")
          : isError
            ? "Không tìm thấy email gần đây từ địa chỉ này."
            : "Đã xử lý thành công.",
        cooldown: DEFAULT_COOLDOWN_SECONDS,
      });
    }

    return res.json({
      ok: false,
      message: "Không thể xử lý phản hồi từ server.",
      cooldown: DEFAULT_COOLDOWN_SECONDS,
    });
  } catch (err) {
    console.error("[netflix] household proxy error:", err);
    return res.status(500).json({ ok: false, error: "Không thể kết nối đến server." });
  }
});

// POST /api/netflix/send-otp
router.post("/send-otp", async (req, res) => {
  const email = (req.body?.email || "").trim();

  if (!email) {
    return res.status(400).json({ ok: false, error: "Missing email" });
  }

  try {
    const upstreamRes = await postUpstreamForm(
      getVivaUrl("/signin_code.php"),
      { user_email: email, access_code: netflixConfig.otpAccessCode }
    );

    const html = await upstreamRes.text();

    const warningMatch = html.match(
      /<div[^>]*class=["'][^"']*access-warning[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );
    const errorMatch = html.match(
      /<div[^>]*class=["'][^"']*error[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );
    const otpMatch =
      html.match(/class=["'][^"']*lrg-number[^"']*["'][^>]*>\s*([0-9]{4,8})\s*</i) ||
      html.match(/Nhập mã này để đăng nhập[\s\S]{0,500}?>([0-9]{4,8})\s*<\/td>/i);
    const subjectMatch = html.match(/<h3>\s*Subject:\s*([\s\S]*?)<\/h3>/i);
    const fromMatch = html.match(/<p>\s*<strong>\s*From:\s*<\/strong>\s*([\s\S]*?)<\/p>/i);
    const dateMatch = html.match(/<p>\s*<strong>\s*Date:\s*<\/strong>\s*([\s\S]*?)<\/p>/i);

    if (otpMatch?.[1]) {
      return res.json({
        ok: true,
        code: otpMatch[1].trim(),
        subject: stripHtml(subjectMatch?.[1]),
        from: stripHtml(fromMatch?.[1]),
        date: stripHtml(dateMatch?.[1]),
        message: `Đã lấy mã OTP mới nhất cho ${email}.`,
      });
    }

    if (warningMatch) {
      return res.json({
        ok: false,
        message: normalizeOtpMessage(warningMatch[1] || ""),
      });
    }

    if (errorMatch) {
      return res.json({
        ok: false,
        message: normalizeOtpMessage(errorMatch[1] || ""),
      });
    }

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      const bodyText = stripHtml(bodyMatch[1]);

      if (/this email is not assigned to you/i.test(bodyText)) {
        return res.json({
          ok: false,
          message: "Email này không được gán cho mã truy cập hiện tại.",
        });
      }

      if (/the access code is invalid/i.test(bodyText)) {
        return res.json({
          ok: false,
          message: "Mã truy cập không hợp lệ.",
        });
      }
    }

    return res.json({
      ok: false,
      message: "Không thể lấy mã OTP từ phản hồi của server.",
    });
  } catch (err) {
    console.error("[netflix] send-otp proxy error:", err);
    return res.status(500).json({ ok: false, error: "Không thể kết nối đến server OTP." });
  }
});

// POST /api/netflix/six-digit-login
router.post("/six-digit-login", async (req, res) => {
  const email = (req.body?.email || "").trim();

  if (!email) {
    return res.status(400).json({ ok: false, error: "Missing email" });
  }

  try {
    const upstreamRes = await postUpstreamForm(
      getVivaUrl("/six_digit_login.php"),
      { user_email: email }
    );

    const html = await upstreamRes.text();

    const warningMatch = html.match(
      /<div[^>]*class=["'][^"']*access-warning[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );
    const errorMatch = html.match(
      /<div[^>]*class=["'][^"']*error[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );
    const codeMatch =
      html.match(/class=["'][^"']*(?:lrg-number|otp|code)[^"']*["'][^>]*>\s*([0-9]{6})\s*</i) ||
      html.match(/Verify\s+with\s+this\s+code:[\s\S]{0,800}?\b([0-9]{6})\b/i);
    const subjectMatch = html.match(/<h3>\s*Subject:\s*([\s\S]*?)<\/h3>/i);
    const fromMatch = html.match(/<p>\s*<strong>\s*From:\s*<\/strong>\s*([\s\S]*?)<\/p>/i);
    const dateMatch = html.match(/<p>\s*<strong>\s*Date:\s*<\/strong>\s*([\s\S]*?)<\/p>/i);

    if (codeMatch?.[1]) {
      return res.json({
        ok: true,
        code: codeMatch[1].trim(),
        subject: stripHtml(subjectMatch?.[1]),
        from: stripHtml(fromMatch?.[1]),
        date: stripHtml(dateMatch?.[1]),
        message: `Đã lấy mã OTP 6 số mới nhất cho ${email}.`,
      });
    }

    if (warningMatch) {
      return res.json({ ok: false, message: normalizeOtpMessage(warningMatch[1] || "") });
    }

    if (errorMatch) {
      return res.json({ ok: false, message: normalizeOtpMessage(errorMatch[1] || "") });
    }

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      const bodyText = stripHtml(bodyMatch[1]);
      if (/no recent email found from this address/i.test(bodyText)) {
        return res.json({ ok: false, message: "Không tìm thấy email gần đây từ địa chỉ này." });
      }
    }

    return res.json({
      ok: false,
      message: "Không thể lấy mã OTP 6 số từ phản hồi của server.",
    });
  } catch (err) {
    console.error("[netflix] six-digit-login proxy error:", err);
    return res.status(500).json({ ok: false, error: "Không thể kết nối đến server OTP 6 số." });
  }
});

// --- CUSTOMER PANEL (cust.php) PROXY ENDPOINTS ---

async function getCustSession() {
  const res = await fetch(getVivaUrl("/cust.php"), {
    method: "POST",
    headers: UPSTREAM_HEADERS,
    body: `main_code=${encodeURIComponent(netflixConfig.mainAccessCode)}&login_main=1`,
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/PHPSESSID=([^;]+)/);
  const sessionId = match ? match[1] : "";
  const html = await res.text();
  return { sessionId, html, cookieHeader: `PHPSESSID=${sessionId}` };
}

function parseSubCodesHtml(html) {
  const list = [];
  const rowRegex = /<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const subCode = stripHtml(match[1]);
    const permText = stripHtml(match[2]);
    const statusText = stripHtml(match[3]);
    const createdText = stripHtml(match[4]);

    if (!subCode || subCode.toLowerCase() === "sub code") continue;

    const isActive = /active/i.test(statusText);
    const permSignin = /signin/i.test(permText);
    const permReset = /reset/i.test(permText);
    const permCountry = /country/i.test(permText);

    list.push({
      subCode,
      permissions: permText,
      status: isActive ? "Active" : "Inactive",
      created: createdText,
      permSignin,
      permReset,
      permCountry,
    });
  }

  return list;
}

// 1. LIST Sub-Access Codes
router.post("/customer-panel/list", async (req, res) => {
  try {
    const { html } = await getCustSession();
    const list = parseSubCodesHtml(html);
    return res.json({ ok: true, data: list });
  } catch (err) {
    console.error("[netflix] cust list error:", err);
    return res.status(500).json({ ok: false, error: "Lỗi kết nối Customer Panel." });
  }
});

// 2. Generate New Sub-Code
router.post("/customer-panel/generate", async (req, res) => {
  const { subCode = "", permSignin = false, permReset = false, permCountry = false } = req.body || {};
  try {
    const { cookieHeader } = await getCustSession();
    const body = new URLSearchParams();
    body.append("sub_code", subCode.trim());
    if (permSignin) body.append("perm_signin", "1");
    if (permReset) body.append("perm_reset", "1");
    if (permCountry) body.append("perm_country", "1");
    body.append("generate_sub", "1");

    const upstreamRes = await fetch(getVivaUrl("/cust.php"), {
      method: "POST",
      headers: { ...UPSTREAM_HEADERS, Cookie: cookieHeader },
      body: body.toString(),
    });

    const html = await upstreamRes.text();
    const list = parseSubCodesHtml(html);

    const errorMatch = html.match(/<div[^>]*class=["'][^"']*error[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const msg = errorMatch ? stripHtml(errorMatch[1]) : "Đã tạo mã phụ thành công.";

    return res.json({ ok: !errorMatch, message: msg, data: list });
  } catch (err) {
    console.error("[netflix] cust generate error:", err);
    return res.status(500).json({ ok: false, error: "Không thể tạo mã phụ." });
  }
});

// 3. Toggle Status (Activate / Deactivate)
router.post("/customer-panel/toggle", async (req, res) => {
  const { subCode } = req.body || {};
  if (!subCode) return res.status(400).json({ ok: false, error: "Missing subCode" });
  try {
    const { cookieHeader } = await getCustSession();
    const upstreamRes = await fetch(getVivaUrl(`/cust.php?toggle=1&sub=${encodeURIComponent(subCode)}`), {
      method: "GET",
      headers: { ...UPSTREAM_HEADERS, Cookie: cookieHeader },
    });
    const html = await upstreamRes.text();
    const list = parseSubCodesHtml(html);
    return res.json({ ok: true, data: list });
  } catch (err) {
    console.error("[netflix] cust toggle error:", err);
    return res.status(500).json({ ok: false, error: "Không thể thay đổi trạng thái mã phụ." });
  }
});

// 4. Delete Sub-Code
router.post("/customer-panel/delete", async (req, res) => {
  const { subCode } = req.body || {};
  if (!subCode) return res.status(400).json({ ok: false, error: "Missing subCode" });
  try {
    const { cookieHeader } = await getCustSession();
    const upstreamRes = await fetch(getVivaUrl(`/cust.php?delete=1&sub=${encodeURIComponent(subCode)}`), {
      method: "GET",
      headers: { ...UPSTREAM_HEADERS, Cookie: cookieHeader },
    });
    const html = await upstreamRes.text();
    const list = parseSubCodesHtml(html);
    return res.json({ ok: true, data: list });
  } catch (err) {
    console.error("[netflix] cust delete error:", err);
    return res.status(500).json({ ok: false, error: "Không thể xóa mã phụ." });
  }
});

// 5. Rename Sub-Code
router.post("/customer-panel/rename", async (req, res) => {
  const { oldSub, newSub } = req.body || {};
  if (!oldSub || !newSub) return res.status(400).json({ ok: false, error: "Missing parameters" });
  try {
    const { cookieHeader } = await getCustSession();
    const body = new URLSearchParams({
      old_sub: oldSub,
      new_sub: newSub.trim(),
      edit_sub_code: "1",
    });

    const upstreamRes = await fetch(getVivaUrl("/cust.php"), {
      method: "POST",
      headers: { ...UPSTREAM_HEADERS, Cookie: cookieHeader },
      body: body.toString(),
    });

    const html = await upstreamRes.text();
    const list = parseSubCodesHtml(html);
    return res.json({ ok: true, data: list });
  } catch (err) {
    console.error("[netflix] cust rename error:", err);
    return res.status(500).json({ ok: false, error: "Không thể đổi tên mã phụ." });
  }
});

// 6. Update Permissions
router.post("/customer-panel/update-perms", async (req, res) => {
  const { subCode, permSignin, permReset, permCountry } = req.body || {};
  if (!subCode) return res.status(400).json({ ok: false, error: "Missing subCode" });
  try {
    const { cookieHeader } = await getCustSession();
    const body = new URLSearchParams();
    body.append("sub_code", subCode);
    if (permSignin) body.append("perm_signin", "1");
    if (permReset) body.append("perm_reset", "1");
    if (permCountry) body.append("perm_country", "1");
    body.append("edit_perms", "1");

    const upstreamRes = await fetch(getVivaUrl("/cust.php"), {
      method: "POST",
      headers: { ...UPSTREAM_HEADERS, Cookie: cookieHeader },
      body: body.toString(),
    });

    const html = await upstreamRes.text();
    const list = parseSubCodesHtml(html);
    return res.json({ ok: true, data: list });
  } catch (err) {
    console.error("[netflix] cust update-perms error:", err);
    return res.status(500).json({ ok: false, error: "Không thể cập nhật quyền mã phụ." });
  }
});

module.exports = router;
