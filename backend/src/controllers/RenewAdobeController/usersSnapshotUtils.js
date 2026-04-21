function toNonNegativeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseUsersSnapshot(rawValue) {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function parseObject(rawValue) {
  if (!rawValue) return null;
  if (typeof rawValue === "object" && !Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch (_) {
      return null;
    }
  }
  return null;
}

function resolveLisenceCount({ explicit = null, usersSnapshot = null, alertConfig = null } = {}) {
  const direct = toNonNegativeNumber(explicit);
  if (direct != null) return direct;

  const users = parseUsersSnapshot(usersSnapshot);
  for (const user of users) {
    const fromSnapshot = toNonNegativeNumber(
      user?.lisencecount ?? user?.licensecount ?? user?.licenseCount
    );
    if (fromSnapshot != null) return fromSnapshot;
  }

  const alertObj = parseObject(alertConfig);
  const fromAlert = toNonNegativeNumber(
    alertObj?.contractActiveLicenseCount ??
      alertObj?.lisencecount ??
      alertObj?.licensecount ??
      alertObj?.licenseCount
  );
  if (fromAlert != null) return fromAlert;

  return null;
}

function attachLisenceCount(users, lisencecount) {
  const list = Array.isArray(users) ? users : [];
  const normalized = toNonNegativeNumber(lisencecount);
  if (normalized == null) return list;

  return list.map((user) => ({
    ...user,
    lisencecount: normalized,
  }));
}

/**
 * Luồng V2 sau add/delete chỉ persist `{ cookies }`. Ghép với config DB hiện tại
 * để không mất contractActiveLicenseCount (tránh fallback MAX_USERS_PER_ACCOUNT).
 */
function mergeRenewAdobeAlertConfig(existingRaw, incomingRaw, usersSnapshotRaw = null) {
  const existing = parseObject(existingRaw) || {};
  let incoming = parseObject(incomingRaw);
  if (incoming == null && Array.isArray(incomingRaw)) {
    incoming = { cookies: incomingRaw };
  }
  incoming = incoming || {};
  if (Object.keys(incoming).length === 0) {
    return existingRaw ?? null;
  }

  const merged = { ...existing, ...incoming };
  let license = resolveLisenceCount({ alertConfig: merged });
  if (license == null) {
    const fromExisting = resolveLisenceCount({ alertConfig: existing });
    if (fromExisting != null) {
      merged.contractActiveLicenseCount = fromExisting;
      license = fromExisting;
    }
  }
  if (license == null && usersSnapshotRaw != null) {
    const fromUsers = resolveLisenceCount({ usersSnapshot: usersSnapshotRaw });
    if (fromUsers != null) {
      merged.contractActiveLicenseCount = fromUsers;
    }
  }
  return merged;
}

module.exports = {
  parseUsersSnapshot,
  resolveLisenceCount,
  attachLisenceCount,
  mergeRenewAdobeAlertConfig,
};
