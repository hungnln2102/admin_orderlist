const { db, withTransaction } = require("@/db");
const { TABLES } = require("@/db/tables");
const { EVENTS, publishEventInTrx } = require("@/events");
const { getVietnamDateString, formatDateDisplay } = require("@/utils/time");
const publishWarehouseEvent = (trx, eventName, payload) => publishEventInTrx(trx, {
  eventName,
  aggregateType: "WAREHOUSE",
  aggregateId: payload.slotId || payload.accountId || payload.id || "WAREHOUSE",
  source: "WAREHOUSE",
  payload,
});

const addServiceSlotToAccount = async (accountId, payload) => {
  const stockId = Number(accountId);
  if (!stockId) throw new Error("ID tài khoản kho không hợp lệ!");

  const {
    serviceName,
    category,
    password,
    backupEmail,
    twoFa,
    expiresAt,
    status = "AVAILABLE",
    note,
    variantTag,
  } = payload || {};

  const slotName = String(serviceName || category || "").trim();
  if (!slotName) {
    throw new Error("Tên loại dịch vụ không được để trống!");
  }

  return await withTransaction(async (trx) => {
    const account = await trx(TABLES.PRODUCT_KEYS).where("id", stockId).first();
    if (!account) {
      throw new Error(`Không tìm thấy tài khoản kho với ID ${stockId}`);
    }

    const now = new Date();

    // 1. Tìm hoặc tạo mới tên dịch vụ trong PRODUCT_NAMES
    let pName = await trx(TABLES.PRODUCT_NAMES)
      .whereRaw("LOWER(name) = ?", [slotName.toLowerCase()])
      .first();

    let nameId = pName?.id;
    if (!nameId) {
      const [insertedP] = await trx(TABLES.PRODUCT_NAMES)
        .insert({ name: slotName })
        .returning("id");
      nameId = insertedP.id || insertedP;
    }

    // 2. Tính toán slot_index lớn nhất hiện tại
    const maxSlot = await trx(TABLES.STOCK_SERVICES)
      .where({ account_id: stockId })
      .max("slot_index as max_index")
      .first();
    const nextSlotIndex = (Number(maxSlot?.max_index) || 0) + 1;

    // 3. Xử lý định dạng ngày hết hạn
    let parsedExpiredAt = null;
    if (expiresAt && String(expiresAt).trim()) {
      const s = String(expiresAt).trim();
      const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        parsedExpiredAt = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`);
      } else {
        const d = new Date(s);
        parsedExpiredAt = isNaN(d.getTime()) ? null : d;
      }
    }

    // 4. Insert slot dịch vụ mới
    const [insertedSlot] = await trx(TABLES.STOCK_SERVICES)
      .insert({
        account_id: stockId,
        name_id: nameId,
        slot_index: nextSlotIndex,
        password: password ? String(password).trim() : null,
        backup_email: backupEmail ? String(backupEmail).trim() : null,
        two_fa: twoFa ? String(twoFa).trim() : null,
        expired_at: parsedExpiredAt,
        status: status || "AVAILABLE",
        service_note: note ? String(note).trim() : null,
        variant_tag: variantTag ? String(variantTag).trim() : null,
        created_at: now,
        updated_at: now,
      })
      .returning("*");

    const result = {
      id: Number(insertedSlot.id),
      account_id: stockId,
      name_id: nameId,
      display_name: slotName,
      variant_tag: insertedSlot.variant_tag || "",
      password: insertedSlot.password || "",
      backup_email: insertedSlot.backup_email || "",
      two_fa: insertedSlot.two_fa || "",
      expires_at: formatDateDisplay(insertedSlot.expired_at),
      raw_expires_at: insertedSlot.expired_at ? new Date(insertedSlot.expired_at).toISOString().split("T")[0] : "",
      status: insertedSlot.status || "AVAILABLE",
      note: insertedSlot.service_note || "",
    };

    await publishWarehouseEvent(trx, EVENTS.WAREHOUSE_STOCK_UPDATED, {
      slotId: Number(insertedSlot.id),
      accountId: stockId,
      accountUsername: account.account_username,
      serviceName: slotName,
    });

    return result;
  });
};

/**
 * Xóa một slot dịch vụ con khỏi tài khoản kho
 */

const deleteWarehouseServiceSlot = async (slotId) => {
  const numericSlotId = Number(slotId);
  if (!numericSlotId) throw new Error("ID slot dịch vụ không hợp lệ!");

  return await withTransaction(async (trx) => {
    const existing = await trx(TABLES.STOCK_SERVICES).where("id", numericSlotId).first();
    if (!existing) {
      throw new Error(`Không tìm thấy slot dịch vụ với ID ${numericSlotId}`);
    }

    await trx(TABLES.STOCK_SERVICES).where("id", numericSlotId).del();

    const remainingCount = await trx(TABLES.STOCK_SERVICES)
      .where("account_id", existing.account_id)
      .count("id as count")
      .first();

    await publishWarehouseEvent(trx, EVENTS.WAREHOUSE_STOCK_UPDATED, {
      slotId: numericSlotId,
      accountId: existing.account_id,
      deleted: true,
    });

    return { success: true, deleted: true, remainingSlots: Number(remainingCount?.count || 0) };
  });
};

const updateWarehouseServiceSlot = async (slotId, payload) => {
  const numericSlotId = Number(slotId);
  if (!numericSlotId) {
    throw new Error("ID slot dịch vụ không hợp lệ!");
  }

  const {
    password,
    backupEmail,
    twoFa,
    expiresAt,
    status,
    note,
    variantTag,
    accountUsername,
  } = payload;

  return await withTransaction(async (trx) => {
    const existingSlot = await trx(TABLES.STOCK_SERVICES)
      .where("id", numericSlotId)
      .first();

    if (!existingSlot) {
      throw new Error(`Không tìm thấy slot dịch vụ với ID ${numericSlotId}`);
    }

    const now = new Date();
    const updateData = {
      updated_at: now,
    };

    if (password !== undefined) updateData.password = password || null;
    if (backupEmail !== undefined) updateData.backup_email = backupEmail || null;
    if (twoFa !== undefined) updateData.two_fa = twoFa || null;
    if (note !== undefined) updateData.service_note = note || null;
    if (variantTag !== undefined) updateData.variant_tag = String(variantTag || "").trim() || null;
    if (status !== undefined) {
      updateData.status = status;
    }

    if (expiresAt !== undefined) {
      if (!expiresAt || !String(expiresAt).trim()) {
        updateData.expired_at = null;
      } else {
        const s = String(expiresAt).trim();
        const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (dmyMatch) {
          const [, day, month, year] = dmyMatch;
          updateData.expired_at = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`);
        } else {
          const d = new Date(s);
          updateData.expired_at = isNaN(d.getTime()) ? null : d;
        }
      }
    }

    await trx(TABLES.STOCK_SERVICES)
      .where("id", numericSlotId)
      .update(updateData);

    // Cập nhật account_username nếu có
    if (accountUsername && String(accountUsername).trim()) {
      const normalizedAccount = String(accountUsername).trim().toLowerCase();
      await trx(TABLES.PRODUCT_KEYS)
        .where("id", existingSlot.account_id)
        .update({
          account_username: normalizedAccount,
          updated_at: now,
        });
    }

    const updatedSlot = await trx(`${TABLES.STOCK_SERVICES} as ss`)
      .leftJoin(`${TABLES.PRODUCT_NAMES} as pn`, "pn.id", "ss.name_id")
      .select(
        "ss.id",
        "ss.account_id",
        "ss.name_id",
        "pn.name as display_name",
        "ss.password",
        "ss.backup_email",
        "ss.two_fa",
        "ss.expired_at as expires_at",
        "ss.status",
        "ss.service_note as note",
        "ss.updated_at"
      )
      .where("ss.id", numericSlotId)
      .first();

    const result = {
      id: Number(updatedSlot.id),
      account_id: Number(updatedSlot.account_id),
      display_name: updatedSlot.display_name || "Dịch vụ",
      variant_tag: updatedSlot.variant_tag || "",
      password: updatedSlot.password || "",
      backup_email: updatedSlot.backup_email || "",
      two_fa: updatedSlot.two_fa || "",
      expires_at: formatDateDisplay(updatedSlot.expires_at),
      raw_expires_at: updatedSlot.expires_at ? new Date(updatedSlot.expires_at).toISOString().split("T")[0] : "",
      status: updatedSlot.status || "AVAILABLE",
      note: updatedSlot.note || "",
    };

    await publishWarehouseEvent(trx, EVENTS.WAREHOUSE_STOCK_UPDATED, {
      slotId: numericSlotId,
      accountId: updatedSlot.account_id,
      updatedFields: updateData,
    });

    return result;
  });
};

/**
 * Cập nhật thông tin dịch vụ trong danh mục (name, category, login_url)
 */
const updateCatalogItem = async (id, payload) => {
  const numericId = Number(id);
  if (!numericId) throw new Error("ID dịch vụ không hợp lệ!");

  const { name, category, loginUrl, productId } = payload || {};
  const title = (name || "").trim();
  if (!title) throw new Error("Tên dịch vụ không được để trống!");

  return await withTransaction(async (trx) => {
    const existing = await trx(TABLES.PRODUCT_NAMES).where("id", numericId).first();
    if (!existing) {
      throw new Error(`Không tìm thấy dịch vụ kho với ID ${numericId}!`);
    }

    const now = new Date();
    const updateData = {
      name: title,
      updated_at: now,
    };
    if (category !== undefined) {
      updateData.category = category ? String(category).trim() : null;
    }
    if (loginUrl !== undefined) {
      updateData.login_url = loginUrl ? String(loginUrl).trim() : null;
    }
    if (productId !== undefined) {
      updateData.product_id = productId ? Number(productId) : null;
    }

    await trx(TABLES.PRODUCT_NAMES).where("id", numericId).update(updateData);

    const updated = await trx(`${TABLES.PRODUCT_NAMES} as pn`)
      .leftJoin(`${TABLES.PRODUCT} as p`, "p.id", "pn.product_id")
      .select(
        "pn.id",
        "pn.name",
        "pn.category",
        "pn.login_url",
        "pn.product_id",
        "p.package_name as system_product_name"
      )
      .where("pn.id", numericId)
      .first();

    await publishWarehouseEvent(trx, EVENTS.WAREHOUSE_CATALOG_UPDATED, {
      id: updated.id,
      name: updated.name,
      category: updated.category,
      loginUrl: updated.login_url,
      productId: updated.product_id,
    });

    return {
      id: updated.id,
      name: updated.name,
      category: updated.category || "",
      loginUrl: updated.login_url || null,
      productId: updated.product_id ? Number(updated.product_id) : null,
      systemProductName: updated.system_product_name || null,
    };
  });
};

/**
 * Lấy danh sách sản phẩm hệ thống từ business.product
 */

module.exports = { addServiceSlotToAccount, deleteWarehouseServiceSlot, updateWarehouseServiceSlot };
