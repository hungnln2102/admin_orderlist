export type PeriodColumn = {
  key: string;
  label: string;
  year: number;
  startKey: string;
  endKey: string;
};

// Start date used for tax and expenses reports (e.g. 2026-04-22).
export const SYSTEM_START_DATE = new Date(2026, 3, 22);

export const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const buildDateColumns = (startDate: Date = SYSTEM_START_DATE): PeriodColumn[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (today < start) {
    return [];
  }

  const columns: PeriodColumn[] = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const key = getDateKey(cursor);
    columns.push({
      key,
      label: `${cursor.getDate()}/${cursor.getMonth() + 1}`,
      year: cursor.getFullYear(),
      startKey: key,
      endKey: key,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return columns;
};

export const buildMonthColumns = (startDate: Date = SYSTEM_START_DATE): PeriodColumn[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (today < start) {
    return [];
  }

  const columns: PeriodColumn[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= today) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const effectiveStart = monthStart < start ? start : monthStart;
    const effectiveEnd = monthEnd > today ? today : monthEnd;

    columns.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: `${month + 1}/${year}`,
      year,
      startKey: getDateKey(effectiveStart),
      endKey: getDateKey(effectiveEnd),
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return columns;
};

const addDaysUtcCache = new Map<string, string>();
export const addDaysUtc = (ymd: string, days: number): string | null => {
  if (!ymd) return null;
  const cacheKey = `${ymd}-${days}`;
  if (addDaysUtcCache.has(cacheKey)) return addDaysUtcCache.get(cacheKey)!;
  
  const [year, month, day] = ymd.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const result = `${y}-${m}-${d}`;
  
  if (addDaysUtcCache.size > 5000) addDaysUtcCache.clear(); // prevent memory leak
  addDaysUtcCache.set(cacheKey, result);
  return result;
};

const countDaysInclusiveCache = new Map<string, number>();
export const countDaysInclusive = (from: string, to: string): number => {
  const cacheKey = `${from}-${to}`;
  if (countDaysInclusiveCache.has(cacheKey)) return countDaysInclusiveCache.get(cacheKey)!;
  
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  if (![fy, fm, fd, ty, tm, td].every(Number.isFinite)) return 0;
  
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  
  const result = end < start ? 0 : Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
  if (countDaysInclusiveCache.size > 5000) countDaysInclusiveCache.clear();
  countDaysInclusiveCache.set(cacheKey, result);
  return result;
};

export const isDateInColumns = (dateKey: string, columns: PeriodColumn[]) => {
  return Boolean(dateKey) && columns.some((column) => dateKey >= column.startKey && dateKey <= column.endKey);
};
