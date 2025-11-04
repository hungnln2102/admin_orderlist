// Date format helpers
export const convertDMYToYMD = (dmyString: string): string => {
  if (!dmyString || dmyString.indexOf("/") === -1) return dmyString;
  const parts = dmyString.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dmyString;
};

export const getTodayDMY = (): string => {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

export const calculateExpirationDate = (
  registerDateStr: string,
  days: number
): string => {
  if (!registerDateStr || days <= 0) return "N/A";
  const parts = registerDateStr.split("/");
  if (parts.length !== 3) return "N/A";
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days - 1);
  const newDay = String(date.getDate()).padStart(2, "0");
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  const newYear = date.getFullYear();
  return `${newDay}/${newMonth}/${newYear}`;
};

export const addMonthsMinusOneDay = (startDMY: string, months: number): string => {
  if (!startDMY || !Number.isFinite(months) || months <= 0) return startDMY;
  const [d, m, y] = startDMY.split("/").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + months);
  dt.setDate(dt.getDate() - 1);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(
    dt.getMonth() + 1
  ).padStart(2, "0")}/${dt.getFullYear()}`;
};

export const inclusiveDaysBetween = (startDMY: string, endDMY: string): number => {
  const [sd, sm, sy] = startDMY.split("/").map(Number);
  const [ed, em, ey] = endDMY.split("/").map(Number);
  const s = new Date(sy, sm - 1, sd);
  const e = new Date(ey, em - 1, ed);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor((e.getTime() - s.getTime()) / msPerDay);
  return diff + 1;
};

const pad2 = (value: number): string => String(value).padStart(2, "0");

const parseFlexibleDate = (
  value: string | number | Date | null | undefined
): Date | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const stringValue = String(value).trim();
  if (!stringValue) return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(stringValue)) {
    const [d, m, y] = stringValue.split("/").map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
  }

  const isoMatch = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch.map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
  }

  const parsed = new Date(stringValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

export const formatDateToDMY = (
  value: string | number | Date | null | undefined
): string => {
  // Fast path: avoid timezone shifts by formatting Y-M-D strings lexically
  if (typeof value === "string") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const [, y, mo, d] = m;
      return `${d}/${mo}/${y}`;
    }
    const m2 = value.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (m2) {
      const [, y, mo, d] = m2;
      return `${d}/${mo}/${y}`;
    }
  }
  const date = parseFlexibleDate(value);
  if (!date) return "";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const daysUntilDate = (
  value: string | number | Date | null | undefined
): number | null => {
  const date = parseFlexibleDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((date.getTime() - today.getTime()) / msPerDay);
};

export const parseMonthsFromInfo = (info?: string): number => {
  if (!info) return 0;
  const m = info.match(/--(\d+)m/i);
  if (!m) return 0;
  const months = Number(m[1] || 0);
  return Number.isFinite(months) && months > 0 ? months : 0;
};

export const daysFromMonths = (months: number): number => {
  if (!Number.isFinite(months) || months <= 0) return 0;
  return months === 12 ? 365 : months * 30;
};

// Currency helpers
export const formatCurrency = (value: number | string): string => {
  const num = Number(value) || 0;
  const rounded = Math.round(num);
  return rounded.toLocaleString("vi-VN") + " ₫";
};

export const formatCurrencyPlain = (value: number): string => {
  const n = Number(value) || 0;
  return n > 0 ? n.toLocaleString("vi-VN") : "";
};

// Misc helpers
export const generateRandomId = (length: number): string => {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
};

export const isRegisteredToday = (dateString: string): boolean => {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let registerDate: Date;
  if (dateString.includes("-")) {
    registerDate = new Date(dateString);
  } else {
    const [day, month, year] = dateString.split("/").map(Number);
    if (!day || !month || !year) return false;
    registerDate = new Date(year, month - 1, day);
  }
  registerDate.setHours(0, 0, 0, 0);
  return registerDate.getTime() === today.getTime();
};

const normalizeStatus = (status: string): string => {
  if (!status) return "";
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const getStatusColor = (status: string): string => {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case "đa thanh toan":
      return "bg-green-100 text-green-800";
    case "chua thanh toan":
    case "can gia han":
      return "bg-yellow-100 text-yellow-800";
    case "het han":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getStatusPriority = (status: string): number => {
  const normalized = normalizeStatus(status);
  if (normalized === "het han") return 1;
  if (normalized === "can gia han") return 2;
  if (normalized === "chua thanh toan") return 3;
  if (normalized === "da thanh toan") return 4;
  return 5;
};



