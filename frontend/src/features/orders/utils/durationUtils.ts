/**
 * Utility functions for parsing package duration and computing order expiration dates.
 */

export interface ParsedDuration {
  days: number;
  durationText: string;
}

/**
 * Trích xuất thời hạn (số ngày & chuỗi văn bản) từ tên gói sản phẩm.
 * Ví dụ: "Canva Pro --12m" -> { days: 365, durationText: "12 tháng" }
 *       "CapCut Pro 1 năm" -> { days: 365, durationText: "1 năm" }
 *       "Youtube Premium 6 tháng" -> { days: 180, durationText: "6 tháng" }
 */
export function parsePackageDuration(text?: string): ParsedDuration {
  if (!text) return { days: 365, durationText: "" };
  const lower = String(text).toLowerCase();

  const matchM = lower.match(/--(\d+)m/i) || lower.match(/(\d+)\s*(tháng|month|m\b)/i);
  const matchY = lower.match(/--(\d+)y/i) || lower.match(/(\d+)\s*(năm|year|y\b)/i);
  const matchD = lower.match(/(\d+)\s*(ngày|day|d\b)/i);

  if (matchM && Number(matchM[1]) > 0) {
    const months = Number(matchM[1]);
    const days = months === 12 ? 365 : months * 30;
    return { days, durationText: `${months} tháng` };
  }

  if (matchY && Number(matchY[1]) > 0) {
    const years = Number(matchY[1]);
    return { days: years * 365, durationText: `${years} năm` };
  }

  if (matchD && Number(matchD[1]) > 0) {
    const days = Number(matchD[1]);
    return { days, durationText: `${days} ngày` };
  }

  return { days: 365, durationText: "" };
}

/**
 * Chuyển đổi ngày truyền vào (string/Date) thành Đối tượng Date đặt ở 00:00:00 (nửa đêm).
 */
export function parseDateToMidnight(dateInput?: string | Date | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const str = String(dateInput).trim();
  if (!str) return null;

  // Nếu là ISO timestamp (ví dụ 2026-10-24T17:00:00.000Z hoặc có chứa giờ)
  if (str.includes("T") || str.includes(":")) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
    }
  }

  // Nếu là chuỗi ngày thuần túy YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  // Nếu là chuỗi ngày thuần túy DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
  }

  return null;
}

/**
 * Định dạng ngày thành chuỗi YYYY-MM-DD theo múi giờ địa phương (tránh lỗi lệch múi giờ của toISOString).
 */
export function formatDateYYYYMMDD(dateInput?: string | Date | null): string {
  const d = parseDateToMidnight(dateInput);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Tính ngày hết hạn (chuỗi YYYY-MM-DD) từ ngày đăng ký (baseDate) và số ngày sử dụng (days).
 */
export function calculateExpirationDate(baseDateInput?: string | Date | null, days: number = 365): string {
  const baseDate = parseDateToMidnight(baseDateInput) || new Date();
  baseDate.setHours(0, 0, 0, 0);
  const expiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  return formatDateYYYYMMDD(expiry);
}


/**
 * Tự động tính ngày hết hạn và số ngày từ ngày bắt đầu dựa theo chu kỳ gói sản phẩm (hoặc số ngày fallback).
 * Hỗ trợ các định dạng:
 * - Tháng: "--1m", "--3m", "--6m", "--12m", "1 tháng", "3 tháng", "6 tháng", "12 tháng"
 * - Năm: "--1y", "--2y", "1 năm", "2 năm"
 * - Ngày: "--30d", "30 ngày"...
 * - An toàn ngày cuối tháng (Ví dụ: 31/01 + 1 tháng -> 28/02 không bị tràn sang tháng 3).
 */
export function calculateExpirationDateFromStart(
  startDateInput?: string | Date | null,
  variantOrText?: string,
  fallbackDays: number = 365
): { expired_at: string; days: number } {
  const start = parseDateToMidnight(startDateInput) || new Date();
  start.setHours(0, 0, 0, 0);

  const y = start.getFullYear();
  const m = start.getMonth() + 1; // 1..12
  const d = start.getDate();

  const text = String(variantOrText || "").toLowerCase();
  const matchM = text.match(/--(\d+)m/i) || text.match(/(\d+)\s*(tháng|month|m\b)/i);
  const matchY = text.match(/--(\d+)y/i) || text.match(/(\d+)\s*(năm|year|y\b)/i);
  const matchD = text.match(/(\d+)\s*(ngày|day|d\b)/i);

  let targetYear = y;
  let targetMonth = m;
  let targetDay = d;

  if (matchM && Number(matchM[1]) > 0) {
    const months = Number(matchM[1]);
    const totalMonths = (m - 1) + months;
    targetYear = y + Math.floor(totalMonths / 12);
    targetMonth = (totalMonths % 12) + 1;
    // Chốt an toàn ngày tối đa của tháng đích (VD: 31/01 -> 28/02)
    const maxDays = new Date(targetYear, targetMonth, 0).getDate();
    targetDay = Math.min(d, maxDays);
  } else if (matchY && Number(matchY[1]) > 0) {
    const years = Number(matchY[1]);
    targetYear = y + years;
    const maxDays = new Date(targetYear, targetMonth, 0).getDate();
    targetDay = Math.min(d, maxDays);
  } else if (matchD && Number(matchD[1]) > 0) {
    const daysToAdd = Number(matchD[1]);
    const expDate = new Date(start.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return {
      expired_at: formatDateYYYYMMDD(expDate),
      days: daysToAdd,
    };
  } else {
    // Fallback theo parsePackageDuration hoặc fallbackDays
    const duration = parsePackageDuration(variantOrText);
    const daysToAdd = duration.days > 0 ? duration.days : (fallbackDays > 0 ? fallbackDays : 365);
    const expDate = new Date(start.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return {
      expired_at: formatDateYYYYMMDD(expDate),
      days: daysToAdd,
    };
  }

  const targetDate = new Date(targetYear, targetMonth - 1, targetDay, 0, 0, 0, 0);
  const diffTime = targetDate.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));

  return {
    expired_at: formatDateYYYYMMDD(targetDate),
    days: diffDays,
  };
}
