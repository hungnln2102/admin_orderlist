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
  return rounded.toLocaleString("vi-VN") + " " + "đ";
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

export const getStatusColor = (status: string): string => {
  const lowerStatus = (status || "").toLowerCase();
  switch (lowerStatus) {
    case "đã thanh toán":
      return "bg-green-100 text-green-800";
    case "chưa thanh toán":
    case "cần gia hạn":
      return "bg-yellow-100 text-yellow-800";
    case "hết hạn":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getStatusPriority = (status: string): number => {
  const lower = (status || "").toLowerCase();
  if (lower === "hết hạn") return 1;
  if (lower === "cần gia hạn") return 2;
  if (lower === "chưa thanh toán") return 3;
  if (lower === "đã thanh toán") return 4;
  return 5;
};

