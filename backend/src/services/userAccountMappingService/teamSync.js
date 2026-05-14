const {
  logger,
  db,
  STATUS,
  TABLE,
  COLS,
  ORDER_TABLE,
  ORDER_COLS,
} = require("./shared");
const {
  getRenewAdobeVariantIds,
  findLatestRenewAdobeOrderByEmail,
} = require("./queryHelpers");

/**
 * Khi add user vào Adobe account:
 * - Tìm đơn hàng trong order_list theo email (đơn còn hiệu lực, thuộc renew_adobe).
 * - Nếu đã có mapping cho (user_email, id_order) → bỏ qua.
 * - Nếu chưa có → INSERT vào mapping table.
 * @param {string|string[]} userEmails
 * @param {number} adobeAccountId
 * @returns {{ recorded: string[], skipped: string[], notFound: string[] }}
 */
async function lookupAndRecordIfNeeded(userEmails, adobeAccountId) {
  const emails = (Array.isArray(userEmails) ? userEmails : [userEmails])
    .map((e) => (e || "").toString().trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return { recorded: [], skipped: [], notFound: [] };

  const variantIds = await getRenewAdobeVariantIds();

  const recorded = [];
  const skipped = [];
  const notFound = [];
  const now = new Date();

  for (const email of emails) {
    const order = await db(ORDER_TABLE)
      .whereIn(ORDER_COLS.ID_PRODUCT, variantIds)
      .whereNot(ORDER_COLS.STATUS, STATUS.EXPIRED)
      .whereRaw(`LOWER(${ORDER_COLS.INFORMATION_ORDER}) = ?`, [email])
      .orderBy(ORDER_COLS.ORDER_DATE, "desc")
      .first();

    if (!order) {
      logger.warn("[Mapping] Không tìm thấy đơn hàng renew_adobe cho email: %s", email);
      notFound.push(email);
      continue;
    }

    const idOrder = order[ORDER_COLS.ID_ORDER];

    const existing = await db(TABLE)
      .where(COLS.USER_EMAIL, email)
      .where(COLS.ORDER_ID, idOrder)
      .first();

    if (existing) {
      if (existing[COLS.ADOBE_ACCOUNT_ID] !== adobeAccountId) {
        await db(TABLE)
          .where(COLS.USER_EMAIL, email)
          .where(COLS.ORDER_ID, idOrder)
          .update({
            [COLS.ADOBE_ACCOUNT_ID]: adobeAccountId || null,
            [COLS.UPDATED_AT]: now,
          });
        logger.info("[Mapping] Cập nhật adobe_account_id cho %s (order=%s)", email, idOrder);
      }
      skipped.push(email);
      continue;
    }

    await db(TABLE).insert({
      [COLS.USER_EMAIL]: email,
      [COLS.ORDER_ID]: idOrder,
      [COLS.ADOBE_ACCOUNT_ID]: adobeAccountId || null,
      [COLS.ASSIGNED_AT]: now,
      [COLS.UPDATED_AT]: now,
    });
    logger.info("[Mapping] Ghi mới mapping: %s | order=%s | adobe=%s", email, idOrder, adobeAccountId);
    recorded.push(email);
  }

  return { recorded, skipped, notFound };
}

async function syncRenewAdobeMappingFromTeamMembers(
  adobeAccountId,
  manageTeamMembers
) {
  const id = Number(adobeAccountId);
  if (!Number.isFinite(id) || id <= 0) {
    return { upserted: 0, skippedNoOrder: 0 };
  }

  const members = Array.isArray(manageTeamMembers) ? manageTeamMembers : [];
  if (members.length === 0) {
    return { upserted: 0, skippedNoOrder: 0 };
  }

  const variantIds = await getRenewAdobeVariantIds();
  if (variantIds.length === 0) {
    return { upserted: 0, skippedNoOrder: 0 };
  }

  let upserted = 0;
  let skippedNoOrder = 0;
  const now = new Date();

  for (const m of members) {
    const email = (m?.email || "").toString().trim().toLowerCase();
    if (!email) continue;

    const productBool = m?.product === true || m?.hasPackage === true;

    const order = await findLatestRenewAdobeOrderByEmail(email, variantIds);

    if (!order) {
      skippedNoOrder += 1;
      continue;
    }

    const idOrder = order[ORDER_COLS.ID_ORDER];
    const existing = await db(TABLE)
      .where(COLS.USER_EMAIL, email)
      .where(COLS.ORDER_ID, idOrder)
      .first();

    const prevAdobe = existing
      ? existing[COLS.ADOBE_ACCOUNT_ID] != null
        ? Number(existing[COLS.ADOBE_ACCOUNT_ID])
        : null
      : null;
    if (
      prevAdobe != null &&
      Number.isFinite(prevAdobe) &&
      prevAdobe > 0 &&
      prevAdobe !== id
    ) {
      logger.warn(
        "[Mapping] Email %s (order=%s) đang map admin %s; check admin %s có user trên team → ghi đè theo Adobe.",
        email,
        idOrder,
        prevAdobe,
        id
      );
    }

    await db(TABLE)
      .insert({
        [COLS.USER_EMAIL]: email,
        [COLS.ORDER_ID]: idOrder,
        [COLS.ADOBE_ACCOUNT_ID]: id,
        [COLS.PRODUCT]: productBool,
        [COLS.ASSIGNED_AT]: now,
        [COLS.UPDATED_AT]: now,
      })
      .onConflict([COLS.USER_EMAIL, COLS.ORDER_ID])
      .merge({
        [COLS.ADOBE_ACCOUNT_ID]: id,
        [COLS.PRODUCT]: productBool,
        [COLS.UPDATED_AT]: now,
      });

    upserted += 1;
  }

  if (upserted > 0) {
    logger.info(
      "[Mapping] syncRenewAdobeMappingFromTeamMembers: adobeAccount=%s upserted=%s skippedNoOrder=%s",
      id,
      upserted,
      skippedNoOrder
    );
  }

  return { upserted, skippedNoOrder };
}

async function clearRenewAdobeMappingForEmailsNotOnTeam(
  adobeAccountId,
  manageTeamMembers
) {
  const id = Number(adobeAccountId);
  if (!Number.isFinite(id) || id <= 0) {
    return { cleared: 0, orderIds: [] };
  }

  const teamEmails = new Set();
  for (const m of Array.isArray(manageTeamMembers) ? manageTeamMembers : []) {
    const e = (m?.email || "").toString().trim().toLowerCase();
    if (e) teamEmails.add(e);
  }

  const rows = await db(TABLE)
    .where(COLS.ADOBE_ACCOUNT_ID, id)
    .select(COLS.ID, COLS.USER_EMAIL, COLS.ORDER_ID);

  const orderIds = [];
  let cleared = 0;
  const now = new Date();
  const trx = await db.transaction();
  try {
    for (const r of rows) {
      const em = (r[COLS.USER_EMAIL] || "").toString().trim().toLowerCase();
      if (!em) continue;
      if (teamEmails.has(em)) continue;

      await trx(TABLE)
        .where(COLS.ID, r[COLS.ID])
        .update({
          [COLS.ADOBE_ACCOUNT_ID]: null,
          [COLS.PRODUCT]: false,
          [COLS.UPDATED_AT]: now,
        });
      cleared += 1;
      const oid = String(r[COLS.ORDER_ID] || "").trim();
      if (oid) orderIds.push(oid);
    }
    await trx.commit();
  } catch (e) {
    await trx.rollback();
    throw e;
  }

  if (cleared > 0) {
    logger.info(
      "[Mapping] clearRenewAdobeMappingForEmailsNotOnTeam: adobeAccount=%s cleared=%d (user không còn trên team Adobe so với check)",
      id,
      cleared
    );
  }
  return { cleared, orderIds: [...new Set(orderIds)] };
}

module.exports = {
  lookupAndRecordIfNeeded,
  syncRenewAdobeMappingFromTeamMembers,
  clearRenewAdobeMappingForEmailsNotOnTeam,
};
