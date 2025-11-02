// Backend shared helpers

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
  const previousEnd = new Date(currentYear, currentMonth - 1, currentDay);
  const formatDate = (d) => d.toISOString().split("T")[0];
  return {
    currentStart: formatDate(currentStart),
    currentEnd: formatDate(currentEnd),
    previousStart: formatDate(previousStart),
    previousEnd: formatDate(previousEnd),
  };
}

module.exports = {
  monthsFromString,
  daysFromMonths,
  convertDMYToYMD,
  calculatePeriods,
};

