const ADES_NOT_ACTIVE_HINTS = [
  "inactive",
  "not active",
  "not_active",
  "not-active",
  "chua active",
  "chưa active",
  "chua kich hoat",
  "chưa kích hoạt",
];

function isLikelyNotActivePayload(data) {
  if (!data || typeof data !== "object") return false;
  const candidates = [
    data.status,
    data.accountStatus,
    data.state,
    data.message,
    data.error,
    data.reason,
    data?.user?.status,
  ];
  return candidates.some((item) => {
    const text = String(item || "").trim().toLowerCase();
    return ADES_NOT_ACTIVE_HINTS.some((hint) => text.includes(hint));
  });
}

function normalizeCheckResultForRenewFlow(result) {
  const shouldTreatAsNoPackage =
    !result?.ok && isLikelyNotActivePayload(result?.data);
  if (!shouldTreatAsNoPackage) {
    return result;
  }
  const normalizedData =
    result?.data && typeof result.data === "object"
      ? {
          ...result.data,
          status: String(result.data.status || "inactive")
            .trim()
            .toLowerCase(),
        }
      : { status: "inactive", message: "Tài khoản chưa active." };
  return {
    ok: true,
    status: result?.status || 200,
    data: normalizedData,
  };
}

module.exports = {
  ADES_NOT_ACTIVE_HINTS,
  isLikelyNotActivePayload,
  normalizeCheckResultForRenewFlow,
};
