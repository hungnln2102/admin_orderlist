const {
    todayYMDInVietnam,
    formatYMDToDMY,
    ymdInVietnamFromInstant,
} = require("../../../utils/normalizers");
const { COLS, STATUS } = require("../constants");

const wholeDaysBetweenYmd = (startYmd, endYmd) => {
    if (!startYmd || !endYmd) return null;
    const [sy, sm, sd] = startYmd.split("-").map(Number);
    const [ey, em, ed] = endYmd.split("-").map(Number);
    if (![sy, sm, sd, ey, em, ed].every((x) => Number.isFinite(x))) return null;
    const a = Date.UTC(sy, sm - 1, sd);
    const b = Date.UTC(ey, em - 1, ed);
    return Math.floor((b - a) / (24 * 60 * 60 * 1000));
};

const normalizeRawToYMD = (value) => {
    if (value === undefined || value === null) return null;
    if (value instanceof Date) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, "0");
        const d = String(value.getDate()).padStart(2, "0");
        return Number.isFinite(y) && Number.isFinite(value.getTime()) ? `${y}-${m}-${d}` : null;
    }
    const s = String(value).trim();
    if (!s) return null;
    const ymdMatch = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (ymdMatch) return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
    const dmyMatch = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    const compactMatch = s.match(/^(\d{4})(\d{2})(\d{2})/);
    if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
    return null;
};

const computeExpiryFromOrderDateAndDays = (row) => {
    const orderDateCol = COLS.ORDER.ORDER_DATE;
    const daysCol = COLS.ORDER.DAYS;
    const regRaw = row.order_date_raw || row.order_date || row[orderDateCol];
    const regYmd = normalizeRawToYMD(regRaw);
    if (!regYmd) return null;
    const days = Number(row.days ?? row[daysCol] ?? 0);
    if (!Number.isFinite(days) || days <= 0) return regYmd;
    const [y, m, d] = regYmd.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days - 1);
    const ey = date.getUTCFullYear();
    const em = String(date.getUTCMonth() + 1).padStart(2, "0");
    const ed = String(date.getUTCDate()).padStart(2, "0");
    return Number.isFinite(ey) ? `${ey}-${em}-${ed}` : null;
};

const normalizeOrderRow = (
    row,
    todayYmd = todayYMDInVietnam(),
    options = {}
) => {
    const registrationRaw = row.order_date_raw || row.order_date || row[COLS.ORDER.ORDER_DATE];
    const expiryRaw = row.expiry_date_raw || row.expiry_date || row[COLS.ORDER.EXPIRY_DATE];

    const registrationYmd = normalizeRawToYMD(registrationRaw);
    let expiryYmd = normalizeRawToYMD(expiryRaw);
    if (!expiryYmd) expiryYmd = computeExpiryFromOrderDateAndDays(row);

    const canceledRaw = row[COLS.ORDER.CANCELED_AT] ?? row.canceled_at;
    const hasCanceledAt =
        canceledRaw !== undefined &&
        canceledRaw !== null &&
        String(canceledRaw).trim() !== "";

    let soNgayConLai = null;

    // Đơn đã hủy: số ngày còn lại = ngày lịch từ canceled_at → expiry (chỉ YMD; ISO có giờ vẫn lấy 10 ký tự đầu).
    if (hasCanceledAt) {
        const canceledYmd =
            normalizeRawToYMD(canceledRaw) || ymdInVietnamFromInstant(canceledRaw);
        if (canceledYmd && expiryYmd) {
            const diff = wholeDaysBetweenYmd(canceledYmd, expiryYmd);
            if (Number.isFinite(diff)) {
                soNgayConLai = Math.max(0, diff);
            }
        }
    } else if (expiryYmd && todayYmd) {
        const [ey, em, ed] = expiryYmd.split("-").map(Number);
        const [ty, tm, td] = todayYmd.split("-").map(Number);
        const expiryUtc = Date.UTC(ey, em - 1, ed);
        const todayUtc = Date.UTC(ty, tm - 1, td);
        soNgayConLai = Math.floor((expiryUtc - todayUtc) / (24 * 60 * 60 * 1000));
        if (!Number.isFinite(soNgayConLai) || soNgayConLai < 0) {
            soNgayConLai = null;
        }
    }

    const dbStatusRaw = row.status || STATUS.UNPAID;
    const autoStatus = dbStatusRaw;

    const registrationDisplay = formatYMDToDMY(registrationYmd);
    const expiryDisplay = formatYMDToDMY(expiryYmd);

    return {
        ...row,
        registration_date: registrationYmd,
        expiry_date: expiryYmd,
        registration_date_str: registrationDisplay,
        expiry_date_str: expiryDisplay,
        registration_date_display: registrationDisplay,
        expiry_date_display: expiryDisplay,
        so_ngay_con_lai: soNgayConLai,
        status: autoStatus,
        status_auto: autoStatus,
    };
};

module.exports = {
    normalizeRawToYMD,
    normalizeOrderRow,
};
