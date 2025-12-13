// Backend shared helpers

const ORDER_PREFIXES = {
  ctv: "MAVC",
  le: "MAVL",
  thuong: "MAVT", // formerly MAVK
};

function monthsFromString(text) {
  if (!text || typeof text !== "string") return 0;
  const m = text.match(/--(\d+)m/i);
  return m ? Number(m[1] || 0) : 0;
}

function daysFromMonths(months) {
  if (!Number.isFinite(months) || months <= 0) return 0;
  if (months === 12) return 365;
  if (months === 24) return 730;
  return months * 30;
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function roundGiaBanValue(value) {
  const numeric = toFiniteNumber(value);
  if (numeric >= 0) {
    return Math.floor(numeric + 0.5);
  }
  return -Math.floor(Math.abs(numeric) + 0.5);
}

function convertDMYToYMD(dmyString) {
  if (
    !dmyString ||
    typeof dmyString !== "string" ||
    dmyString.length < 10 ||
    dmyString.indexOf("/") === -1
  ) {
    return dmyString;
  }
  const parts = dmyString.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dmyString;
}

function calculatePeriods() {
  const now = new Date();
  if (process.env.MOCK_DATE) {
    const mockDate = new Date(process.env.MOCK_DATE);
    if (!isNaN(mockDate)) {
      now.setTime(mockDate.getTime());
    }
  }

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  const currentStart = new Date(currentYear, currentMonth, 1);
  const currentEnd = new Date(currentYear, currentMonth, currentDay);

  const previousStart = new Date(currentYear, currentMonth - 1, 1);
  const previousMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
  const previousEndDay = Math.min(currentDay, previousMonthLastDay);
  const previousEnd = new Date(currentYear, currentMonth - 1, previousEndDay);

  const formatDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    currentStart: formatDate(currentStart),
    currentEnd: formatDate(currentEnd),
    previousStart: formatDate(previousStart),
    previousEnd: formatDate(previousEnd),
  };
}

module.exports = {
  ORDER_PREFIXES,
  monthsFromString,
  daysFromMonths,
  roundGiaBanValue,
  convertDMYToYMD,
  calculatePeriods,
};
