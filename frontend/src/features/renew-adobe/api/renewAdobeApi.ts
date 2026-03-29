import { API_ENDPOINTS } from "@/constants";
import { API_BASE_URL } from "@/shared/api/client";
import { normalizeAdobeAdminAccount } from "../utils/accountUtils";

export function fetchAdobeAdminAccounts() {
  return fetch(`${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_ACCOUNTS}`, {
    credentials: "include",
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(res.statusText || "Lỗi tải danh sách");
      }
      return res.json();
    })
    .then((rows: Record<string, unknown>[]) =>
      rows.map(normalizeAdobeAdminAccount)
    );
}
