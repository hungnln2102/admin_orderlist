# Adobe Multi-Org Management System

## Kiến trúc tổng thể

```
Admin Account (email + password)
          │
          ▼ Puppeteer tự động đăng nhập
    User Token (24h)
          │
    ┌─────┴──────┐
    │            │
    ▼            ▼
IMS API      UMAPI / JIL API
(list orgs)  (check license, manage users)
    │            │
    ▼            ▼
┌───────────────────────────────┐
│  Org A │ Org B │ Org C │ ...  │
│        │       │       │      │
│ check  │ check │ check │ ...  │ ← còn gói?
│ users  │ users │ users │ ...  │ ← xóa user?
└───────────────────────────────┘
```

---

## Bước 1 — Lấy User Token bằng Puppeteer

Vì Adobe chặn ROPC với public client, dùng Puppeteer bắt token từ browser.

### Cài đặt

```bash
npm install puppeteer
```

### Script lấy token

```typescript
// get-token.ts
import puppeteer from "puppeteer";

export async function getAdobeUserToken(
  email: string,
  password: string
): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  let capturedToken = "";

  // Bắt token từ request headers
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const auth = req.headers()["authorization"] ?? "";
    if (auth.startsWith("Bearer ") && auth.length > 100) {
      capturedToken = auth.replace("Bearer ", "");
    }
    req.continue();
  });

  try {
    // Mở trang Admin Console → sẽ redirect về IMS login
    await page.goto("https://adminconsole.adobe.com", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Nhập email
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.type('input[name="username"]', email, { delay: 50 });
    await page.keyboard.press("Enter");

    // Nhập password
    await page.waitForSelector('input[name="password"]', { timeout: 15000 });
    await page.type('input[name="password"]', password, { delay: 50 });
    await page.keyboard.press("Enter");

    // Chờ load xong trang Admin Console
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Lấy token từ localStorage (backup nếu không bắt được từ request)
    if (!capturedToken) {
      capturedToken = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i) ?? "";
          if (key.includes("token") || key.includes("ims")) {
            const val = localStorage.getItem(key) ?? "";
            if (val.length > 100) return val;
          }
        }
        return "";
      });
    }
  } finally {
    await browser.close();
  }

  if (!capturedToken) throw new Error("Không lấy được token");
  return capturedToken;
}
```

---

## Bước 2 — Lấy danh sách tất cả Org

```typescript
// orgs.ts
export interface AdobeOrg {
  orgId: string;
  orgName: string;
  orgType: string;
  countryCode: string;
}

export async function getAllOrgs(token: string): Promise<AdobeOrg[]> {
  const res = await fetch("https://ims-na1.adobelogin.com/ims/organizations", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Get orgs failed: ${res.status}`);
  return (await res.json()) as AdobeOrg[];
}
```

---

## Bước 3 — Kiểm tra Org còn gói hay không

```typescript
// check-license.ts
export interface ConsumableSummary {
  orgId: string;
  hasActiveLicense: boolean;
  products: {
    productName: string;
    totalQuantity: number;
    consumedQuantity: number;
    remainingQuantity: number;
    status: string;
  }[];
}

export async function checkOrgLicense(
  token: string,
  orgId: string,
  clientId: string
): Promise<ConsumableSummary> {
  const res = await fetch(
    `https://bps-il.adobe.io/jil-api/v2/organizations/${encodeURIComponent(orgId)}/consumables:summary`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Api-Key": clientId,
      },
    }
  );

  if (!res.ok) {
    return { orgId, hasActiveLicense: false, products: [] };
  }

  const data = await res.json() as { consumables?: any[] };
  const consumables = data.consumables ?? [];

  const products = consumables.map((c: any) => ({
    productName: c.productName ?? "Unknown",
    totalQuantity: c.totalQuantity ?? 0,
    consumedQuantity: c.consumedQuantity ?? 0,
    remainingQuantity: c.remainingQuantity ?? 0,
    status: c.consumableStatus ?? "UNKNOWN",
  }));

  const hasActiveLicense = products.some(
    (p) => p.status === "ACTIVE" && p.totalQuantity > 0
  );

  return { orgId, hasActiveLicense, products };
}
```

---

## Bước 4 — Lấy danh sách toàn bộ User trong Org

```typescript
// list-users.ts
export interface OrgUser {
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  userType: string;
}

export async function getAllUsersInOrg(
  token: string,
  orgId: string,
  clientId: string
): Promise<OrgUser[]> {
  const allUsers: OrgUser[] = [];
  let page = 0;

  while (true) {
    const res = await fetch(
      `https://usermanagement.adobe.io/v2/usermanagement/users/${encodeURIComponent(orgId)}/${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": clientId,
        },
      }
    );

    if (!res.ok) break;

    const data = await res.json() as { users?: any[]; lastPage?: boolean };
    const users: OrgUser[] = (data.users ?? []).map((u: any) => ({
      email: u.email ?? "",
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      status: u.status ?? "",
      userType: u.userType ?? "",
    }));

    allUsers.push(...users);

    if (data.lastPage === true || users.length === 0) break;
    page++;

    await new Promise((r) => setTimeout(r, 300)); // tránh rate limit
  }

  return allUsers;
}
```

---

## Bước 5 — Xóa toàn bộ User khỏi Org

```typescript
// remove-users.ts
export async function removeUserFromOrg(
  token: string,
  orgId: string,
  clientId: string,
  email: string
): Promise<boolean> {
  const res = await fetch(
    `https://usermanagement.adobe.io/v2/usermanagement/action/${encodeURIComponent(orgId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": clientId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          user: email,
          do: [{ remove: "org" }],
        },
      ]),
    }
  );

  return res.ok;
}

export async function removeAllUsersFromOrg(
  token: string,
  orgId: string,
  clientId: string,
  users: OrgUser[]
): Promise<{ removed: string[]; failed: string[] }> {
  const removed: string[] = [];
  const failed: string[] = [];

  for (const user of users) {
    if (!user.email) continue;

    const ok = await removeUserFromOrg(token, orgId, clientId, user.email);
    if (ok) {
      removed.push(user.email);
      console.log(`  ✅ Đã xóa: ${user.email}`);
    } else {
      failed.push(user.email);
      console.log(`  ❌ Lỗi xóa: ${user.email}`);
    }

    await new Promise((r) => setTimeout(r, 200)); // tránh rate limit
  }

  return { removed, failed };
}
```

---

## Script tổng hợp — Chạy toàn bộ

```typescript
// main.ts
import { getAdobeUserToken } from "./get-token";
import { getAllOrgs } from "./orgs";
import { checkOrgLicense } from "./check-license";
import { getAllUsersInOrg } from "./list-users";
import { removeAllUsersFromOrg } from "./remove-users";

const CONFIG = {
  email: "admin@domain.com",
  password: "YOUR_PASSWORD",
  clientId: "YOUR_CLIENT_ID", // từ Adobe Developer Console
};

async function main() {
  // ── 1. Lấy token
  console.log("🔐 Đang lấy token...");
  const token = await getAdobeUserToken(CONFIG.email, CONFIG.password);
  console.log("✅ Token OK\n");

  // ── 2. Lấy danh sách org
  console.log("🏢 Đang lấy danh sách org...");
  const orgs = await getAllOrgs(token);
  console.log(`✅ Tìm thấy ${orgs.length} org\n`);

  const report: any[] = [];

  for (const org of orgs) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`📋 Org: ${org.orgName}`);
    console.log(`   ID : ${org.orgId}`);

    // ── 3. Kiểm tra license
    const license = await checkOrgLicense(token, org.orgId, CONFIG.clientId);
    const licenseIcon = license.hasActiveLicense ? "✅ CÒN GÓI" : "❌ HẾT GÓI";
    console.log(`   License: ${licenseIcon}`);

    license.products.forEach((p) => {
      console.log(
        `   - ${p.productName}: ${p.consumedQuantity}/${p.totalQuantity} (${p.status})`
      );
    });

    // ── 4. Lấy danh sách user
    const users = await getAllUsersInOrg(token, org.orgId, CONFIG.clientId);
    console.log(`   Users: ${users.length} người`);

    report.push({
      orgName: org.orgName,
      orgId: org.orgId,
      hasActiveLicense: license.hasActiveLicense,
      userCount: users.length,
      products: license.products,
    });

    // ── 5. Nếu hết gói → xóa toàn bộ user
    if (!license.hasActiveLicense && users.length > 0) {
      console.log(`\n   ⚠️  Org hết gói — đang xóa ${users.length} user...`);
      const result = await removeAllUsersFromOrg(
        token,
        org.orgId,
        CONFIG.clientId,
        users
      );
      console.log(
        `   Đã xóa: ${result.removed.length} | Lỗi: ${result.failed.length}`
      );
    }
  }

  // ── Báo cáo tổng
  console.log(`\n${"═".repeat(50)}`);
  console.log("📊 BÁO CÁO TỔNG:");
  console.log(`${"═".repeat(50)}`);
  report.forEach((r) => {
    const status = r.hasActiveLicense ? "✅ CÒN GÓI" : "❌ HẾT GÓI";
    console.log(`${status}  ${r.orgName} (${r.userCount} users)`);
  });
}

main().catch(console.error);
```

---

## Tự động chạy theo lịch (Cron)

```typescript
// scheduler.ts — chạy mỗi ngày lúc 2:00 sáng
import cron from "node-cron";

cron.schedule("0 2 * * *", async () => {
  console.log(`[${new Date().toISOString()}] Bắt đầu kiểm tra org...`);
  await main();
});
```

---

## Tóm tắt API dùng

| Chức năng | Method | Endpoint |
|---|---|---|
| Lấy token | Puppeteer | `adminconsole.adobe.com` |
| Danh sách org | GET | `ims-na1.adobelogin.com/ims/organizations` |
| Kiểm tra license | GET | `bps-il.adobe.io/jil-api/v2/organizations/{id}/consumables:summary` |
| Danh sách user | GET | `usermanagement.adobe.io/v2/usermanagement/users/{orgId}/{page}` |
| Xóa user | POST | `usermanagement.adobe.io/v2/usermanagement/action/{orgId}` |

## Lưu ý

| Vấn đề | Giải pháp |
|---|---|
| Token hết hạn sau 24h | Chạy lại Puppeteer lấy token mới |
| Rate limit UMAPI: 10 req/giây | Đã thêm `setTimeout(200ms)` giữa mỗi request |
| 2FA bật trên account | Tắt 2FA hoặc dùng SMS OTP tự động qua API |
| Org dùng Federated SSO | Cần thêm `domain` vào payload remove user |


CREATE TABLE accounts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Thông tin đăng nhập
  email           TEXT NOT NULL UNIQUE,
  password_enc    TEXT NOT NULL,
  -- Token (cache, tránh login lại mỗi lần)
  access_token    TEXT,
  token_expires   DATETIME,
  adobe_org_id    TEXT,            -- "XXXXXXXX@AdobeOrg"
  org_name        TEXT,
  org_type        TEXT,
   -- License (cập nhật mỗi lần check)
  license_status  TEXT DEFAULT 'unknown',  -- active | expired | unknown
  license_detail  TEXT,  
    -- Users (snapshot mỗi lần sync)
  user_count      INTEGER DEFAULT 0,
  users_snapshot  TEXT,  
  -- Alert
  alert_target    TEXT,                    -- telegram:CHAT_ID | webhook:URL

  -- Meta
  last_checked    DATETIME,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 2: log hành động (giữ riêng vì append-only)
CREATE TABLE action_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id  INTEGER NOT NULL REFERENCES accounts(id),
  action      TEXT NOT NULL,   -- CHECK_LICENSE | REMOVE_USERS | LOGIN | SYNC
  status      TEXT NOT NULL,   -- success | failed
  detail      TEXT,            -- JSON hoặc error message
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


1. Có thể lấy được tên Profile không
2. Tôi muốn thêm 1 bảng lấy thông tin user. Chỉ cần lấy ra email user đó là gì thôi