const test = require("node:test");
const assert = require("node:assert/strict");

// We test the logic of calculateExpirationDateFromStart directly
function parsePackageDuration(text) {
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

function parseDateToMidnight(dateInput) {
  if (!dateInput) return null;
  const str = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  return new Date(str);
}

function formatDateYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calculateExpirationDateFromStart(startDateInput, variantOrText, fallbackDays = 365) {
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

test("calculateExpirationDateFromStart: Youtube_Fam--3m starts on 2026-10-09 ends on 2027-01-09", () => {
  const result = calculateExpirationDateFromStart("2026-10-09", "Youtube_Fam--3m");
  assert.equal(result.expired_at, "2027-01-09");
  assert.equal(result.days, 92);
});

test("calculateExpirationDateFromStart: 1 month package starts on 2026-10-09 ends on 2026-11-09", () => {
  const result = calculateExpirationDateFromStart("2026-10-09", "Adobe_Renew--1m");
  assert.equal(result.expired_at, "2026-11-09");
  assert.equal(result.days, 31);
});

test("calculateExpirationDateFromStart: 1 year package starts on 2026-10-09 ends on 2027-10-09", () => {
  const result = calculateExpirationDateFromStart("2026-10-09", "Canva Pro --1y");
  assert.equal(result.expired_at, "2027-10-09");
  assert.equal(result.days, 365);
});

test("calculateExpirationDateFromStart: End of month edge case (31/01 -> 28/02 in non-leap year)", () => {
  const result = calculateExpirationDateFromStart("2026-01-31", "--1m");
  assert.equal(result.expired_at, "2026-02-28");
});

