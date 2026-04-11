const {
  pool,
  ORDER_TABLE,
  ORDER_COLS,
} = require("./config");
const { STATUS: ORDER_STATUS } = require("../../src/controllers/Order/constants");
const { daysUntil } = require("./utils");

const fetchOrderState = async (orderCode) => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT
        ${ORDER_COLS.status},
        ${ORDER_COLS.expiryDate}
      FROM ${ORDER_TABLE}
      WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
      LIMIT 1`,
      [orderCode]
    );
    return res.rows[0] || null;
  } finally {
    client.release();
  }
};

const isEligibleForRenewal = (statusValue, expiryDate) => {
  const statusText = String(statusValue || "");
  const daysLeft = daysUntil(expiryDate);

  // Chỉ trạng thái Cần Gia Hạn (RENEWAL) mới được phép gia hạn tự động.
  // PROCESSING là trạng thái SAU KHI renewal, không phải điều kiện để renewal.
  // Hết Hạn (EXPIRED) không còn eligible trong rule mới.
  const readyForRenew = daysLeft <= 4 && statusText === ORDER_STATUS.RENEWAL;

  return {
    eligible: readyForRenew,
    forceRenewal: false,
    daysLeft,
    statusNorm: statusText,
  };
};

const fetchRenewalCandidates = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT
        ${ORDER_COLS.idOrder} AS order_code,
        ${ORDER_COLS.status} AS status_value,
        ${ORDER_COLS.expiryDate} AS expiry_date_value
      FROM ${ORDER_TABLE}
      WHERE TRIM(${ORDER_COLS.idOrder}::text) <> ''`
    );

    const candidates = [];
    for (const row of res.rows) {
      const orderCode = (row.order_code || "").trim();
      if (!orderCode) continue;
      const eligibility = isEligibleForRenewal(
        row.status_value,
        row.expiry_date_value
      );

      if (eligibility.eligible) {
        candidates.push({
          orderCode,
          forceRenewal: eligibility.forceRenewal,
          daysLeft: eligibility.daysLeft,
          status: eligibility.statusNorm,
        });
      }
    }
    return candidates;
  } finally {
    client.release();
  }
};

module.exports = {
  fetchOrderState,
  isEligibleForRenewal,
  fetchRenewalCandidates,
};
