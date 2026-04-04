import * as Helpers from "@/lib/helpers";
import type { AdobeAdminAccount, LicenseStatus, SnapshotUser } from "../types";
import type { DisplayStatus, OrderInfo, UserOrderRow } from "./types";

/**
 * Chỉ true khi scrape báo rõ user đã có product (cột Sản phẩm trên Adobe).
 * null/undefined/chuỗi rỗng → không kế thừa license của admin (tránh "Còn gói" sai).
 */
export function userHasAssignedProduct(
  userProduct: boolean | string | number | undefined | null
): boolean {
  if (userProduct === true) return true;
  if (typeof userProduct === "number") return userProduct === 1;
  if (typeof userProduct === "string") {
    const n = userProduct.trim().toLowerCase();
    return n === "true" || n === "1" || n === "yes";
  }
  return false;
}

export function resolveDisplayStatus(
  userProduct: boolean | string | number | undefined | null,
  accountLicenseStatus: LicenseStatus
): DisplayStatus {
  if (!userHasAssignedProduct(userProduct)) {
    return "no_product";
  }

  return accountLicenseStatus;
}

export function buildEmailOrderMap(
  orders: OrderInfo[]
): Map<string, OrderInfo> {
  const map = new Map<string, OrderInfo>();

  for (const order of orders) {
    const email = (order.information_order || "").trim().toLowerCase();
    if (email && !map.has(email)) {
      map.set(email, order);
    }
  }

  return map;
}

export function flattenToUserRows(
  accounts: AdobeAdminAccount[],
  emailOrderMap: Map<string, OrderInfo>
): UserOrderRow[] {
  type SnapshotInfo = {
    accountId: number;
    orgName: string;
    product: boolean | string | number | undefined;
    licenseStatus: LicenseStatus;
  };

  const snapshotLookup = new Map<string, SnapshotInfo>();

  for (const account of accounts) {
    let users: SnapshotUser[] = [];

    if (account.users_snapshot) {
      try {
        users = JSON.parse(account.users_snapshot) as SnapshotUser[];
      } catch {
        users = [];
      }
    }

    for (const user of users) {
      const key = (user.email || "").toLowerCase().trim();
      if (key && !snapshotLookup.has(key)) {
        snapshotLookup.set(key, {
          accountId: account.id,
          orgName: account.org_name ?? "—",
          product: user.product,
          licenseStatus: account.license_status,
        });
      }
    }
  }

  const rows: UserOrderRow[] = [];
  for (const [email, order] of emailOrderMap) {
    const snapshot = snapshotLookup.get(email);

    rows.push({
      id: snapshot ? `acc-${snapshot.accountId}-${email}` : `order-${email}`,
      order_code: order.order_code ?? "—",
      customer_name: order.customer || "—",
      email,
      profile: snapshot?.orgName ?? "—",
      display_status: snapshot
        ? resolveDisplayStatus(snapshot.product, snapshot.licenseStatus)
        : "unknown",
      expiry: order.expiry_date
        ? Helpers.formatDateToDMY(order.expiry_date)
        : "—",
      accountId: snapshot?.accountId ?? 0,
    });
  }

  return rows;
}
