const express = require("express");

const router = express.Router();

const DEFAULT_COOLDOWN_SECONDS = 30;
const OTP_ACCESS_CODE = "mvrk01";
const UPSTREAM_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

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
      "https://vivarocky.in/household.php",
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
      "https://vivarocky.in/signin_code.php",
      { user_email: email, access_code: OTP_ACCESS_CODE }
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
      "https://vivarocky.in/six_digit_login.php",
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

module.exports = router;
