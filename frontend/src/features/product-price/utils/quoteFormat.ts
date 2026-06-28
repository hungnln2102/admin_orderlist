import { htmlToPlainText } from "@/shared/html";

export const formatCurrency = (value: number): string =>
  value.toLocaleString("vi-VN");

export const displayDate = (iso: string): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

/** YYYY-MM-DD theo lịch local (hôm nay). */
export function todayYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export { htmlToPlainText };
