import * as Helpers from "@/lib/helpers";
import type { AdobeAdminAccount, LicenseStatus, SnapshotUser } from "../types";
import type { DisplayStatus, OrderInfo, UserOrderRow } from "./types";

export function resolveDisplayStatus(
  userProduct: boolean | string | undefined,
  accountLicenseStatus: LicenseStatus
): DisplayStatus {
  if (userProduct === false || userProduct === "false") {
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
    product: boolean | string | undefined;
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
