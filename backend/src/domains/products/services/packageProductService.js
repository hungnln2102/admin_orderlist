const { db, TABLES } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { getVietnamDateString } = require("@/utils/time");

/**
 * Service lấy danh sách Kho Gói Sản Phẩm từ bảng warehouse.package_products
 * Kết hợp với warehouse.product_names và warehouse.accounts (Tài khoản gốc & Tài khoản liên kết)
 */
const getPackageProducts = async () => {
  const query = `
    SELECT
      pp.id,
      pp.product_name_id,
      pn.name AS product_name,
      pn.product_id AS category_product_id,
      COALESCE(pn.name, 'Khác') AS category,
      pn.requires_storage AS category_requires_storage,
      COALESCE(acc.account_username, 'Tài khoản kho #' || pp.id) AS account_info,
      COALESCE(acc_slot.password, acc.password) AS password,
      acc_slot.two_fa,
      acc_slot.backup_email,
      storage_acc.account_username AS storage_account_info,
      COALESCE(storage_slot.password, storage_acc.password) AS storage_password,
      storage_slot.two_fa AS storage_two_fa,
      storage_slot.backup_email AS storage_backup_email,
      COALESCE(pp.supplier, 'Mavryk') AS supplier,
      COALESCE(pp.cost, 0) AS cost_price,
      COALESCE(pp.slot, 2) AS total_slots,
      pp.storage_total,
      pp.match_rule,
      pp.package_note
    FROM ${TABLES.PACKAGE_PRODUCT} pp
    LEFT JOIN ${TABLES.PRODUCT_NAMES} pn ON pn.id = pp.product_name_id
    LEFT JOIN ${TABLES.PRODUCT_KEYS} acc ON acc.id = pp.account_id
    LEFT JOIN LATERAL (
      SELECT password, two_fa, backup_email
      FROM ${TABLES.STOCK_SERVICES}
      WHERE account_id = pp.account_id
      ORDER BY id ASC
      LIMIT 1
    ) acc_slot ON true
    LEFT JOIN ${TABLES.PRODUCT_KEYS} storage_acc ON storage_acc.id = pp.storage_account_id
    LEFT JOIN LATERAL (
      SELECT password, two_fa, backup_email
      FROM ${TABLES.STOCK_SERVICES}
      WHERE account_id = pp.storage_account_id
      ORDER BY id ASC
      LIMIT 1
    ) storage_slot ON true
    ORDER BY pp.id DESC;
  `;

  const result = await db.raw(query);
  const rows = result.rows || [];
  if (rows.length === 0) return [];

  // Lọc chỉ các từ khóa tài khoản thực sự tồn tại trong danh sách gói để truy vấn có mục tiêu
  const targetAccounts = Array.from(
    new Set(
      rows
        .map((r) => r.account_info && String(r.account_info).trim().toLowerCase())
        .filter((acc) => Boolean(acc) && !acc.startsWith("tài khoản kho #"))
    )
  );

  let ordersList = [];
  let variantMap = new Map();
  if (targetAccounts.length > 0) {
    ordersList = await db(TABLES.ORDER_LIST)
      .select("id", "id_order", "id_product", "customer", "contact", "information_order", "slot", "status", "expired_at", "cost", "supply_id")
      .whereIn("status", [
        ORDER_STATUS.PAID,
        ORDER_STATUS.RENEW_REQUIRED,
        "Đã Thanh Toán",
        "Cần Gia Hạn",
      ])
      .whereRaw("(expired_at IS NULL OR expired_at::date >= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)")
      .whereNot("id_order", "ilike", "MAVN%")
      .whereRaw("LOWER(COALESCE(customer, '')) != 'mavryk'")
      .whereRaw("LOWER(COALESCE(status, '')) NOT LIKE '%nhập hàng%'")
      .where((builder) => {
        targetAccounts.forEach((acc) => {
          builder.orWhereILike("information_order", `%${acc}%`);
          builder.orWhereRaw("CAST(slot AS TEXT) ILIKE ?", [`%${acc}%`]);
        });
      });

    const vIds = Array.from(new Set(ordersList.map((o) => parseInt(o.id_product, 10)).filter((id) => Number.isInteger(id) && id > 0)));
    if (vIds.length > 0) {
      const variants = await db(`${TABLES.VARIANT} as v`)
        .leftJoin(`${TABLES.PRODUCT} as p`, "p.id", "v.product_id")
        .whereIn("v.id", vIds)
        .select("v.id", "v.product_id", "v.variant_name", "v.display_name", "p.package_name as product_package_name");
      variantMap = new Map(variants.map((v) => [String(v.id), v]));
    }
  }

  const extractCapacityFromVariant = (variantName, displayName) => {
    const text = `${variantName || ""} ${displayName || ""}`.toLowerCase();
    const tbMatch = text.match(/(\d+(?:\.\d+)?)\s*tb/);
    if (tbMatch) return Math.round(parseFloat(tbMatch[1]) * 1000);
    const gbMatch = text.match(/(\d+)\s*gb/);
    if (gbMatch) return parseInt(gbMatch[1], 10);
    return null;
  };

  const todayStr = getVietnamDateString();
  const pkgIds = rows.map((r) => Number(r.id)).filter(Boolean);

  let accumulatedMap = new Map();
  let todayLogMap = new Map();

  if (pkgIds.length > 0) {
    try {
      const statsRows = await db(TABLES.PACKAGE_SLOT_DAILY_LOGS)
        .whereIn("package_product_id", pkgIds)
        .groupBy("package_product_id")
        .select(
          "package_product_id",
          db.raw("COALESCE(SUM(vacant_cost), 0)::numeric as total_vacant_cost")
        );
      accumulatedMap = new Map(
        statsRows.map((s) => [Number(s.package_product_id), Number(s.total_vacant_cost || 0)])
      );

      const todayRows = await db(TABLES.PACKAGE_SLOT_DAILY_LOGS)
        .where("log_date", todayStr)
        .whereIn("package_product_id", pkgIds)
        .select("package_product_id", "import_order_code", "cost_per_slot_day", "vacant_slots", "vacant_cost");
      todayLogMap = new Map(
        todayRows.map((t) => [Number(t.package_product_id), t])
      );
    } catch (logErr) {
      console.warn("[ProductService] Không thể tải thống kê package_slot_daily_logs:", logErr.message);
    }
  }

  // Lấy các đơn nhập hàng MAVN khớp theo tài khoản (cả đơn active hôm nay và đơn mới nhất)
  let mavnOrderByAccount = new Map();
  let latestMavnByAccount = new Map();
  if (targetAccounts.length > 0) {
    try {
      const allMavnOrders = await db(TABLES.ORDER_LIST)
        .where("id_order", "ilike", "MAVN%")
        .andWhere("cost", ">", 0)
        .andWhereRaw("LOWER(COALESCE(status, '')) NOT IN ('cancel', 'canceled', 'đã hủy')")
        .select("id", "id_order", "cost", "days", "information_order", "order_date", "expired_at")
        .orderBy("id", "desc");

      for (const ord of allMavnOrders) {
        const accKey = String(ord.information_order || "").trim().toLowerCase();
        if (accKey) {
          // 1. Lưu đơn MAVN mới nhất của tài khoản (để lấy hạn thực tế, giá vốn, mã đơn nhập)
          if (!latestMavnByAccount.has(accKey)) {
            latestMavnByAccount.set(accKey, ord);
          }

          // 2. Lưu đơn MAVN đang còn hiệu lực tại ngày hôm nay (để tính chi phí slot phát sinh hôm nay)
          const orderDateStr = ord.order_date ? getVietnamDateString(ord.order_date) : null;
          const expiredAtStr = ord.expired_at ? getVietnamDateString(ord.expired_at) : null;
          const isStarted = !orderDateStr || orderDateStr <= todayStr;
          const isNotExpired = !expiredAtStr || expiredAtStr >= todayStr;
          if (isStarted && isNotExpired && !mavnOrderByAccount.has(accKey)) {
            mavnOrderByAccount.set(accKey, ord);
          }
        }
      }
    } catch (mavnErr) {
      console.warn("[ProductService] Không thể tải danh sách đơn nhập MAVN:", mavnErr.message);
    }
  }

  return rows.map((r) => {
    const matchRule = (r.match_rule || "information").toLowerCase();
    const matchingOrders = ordersList.filter((o) => {
      if (!r.account_info) return false;

      // 1. Chỉ chấp nhận các đơn Đã Thanh Toán hoặc Cần Gia Hạn
      const statusUpper = String(o.status || "").trim().toUpperCase();
      const validStatuses = [
        ORDER_STATUS.PAID,
        ORDER_STATUS.RENEW_REQUIRED,
        "ĐÃ THANH TOÁN",
        "CẦN GIA HẠN",
      ];
      if (!validStatuses.includes(statusUpper)) return false;

      // 2. Tuyệt đối không khớp đơn nhập hàng MAVN, khách Mavryk hoặc đơn có trạng thái nhập hàng
      const idOrder = String(o.id_order || "").toUpperCase();
      if (idOrder.startsWith("MAVN")) return false;
      if (String(o.customer || "").trim().toLowerCase() === "mavryk") return false;
      if (String(o.status || "").toLowerCase().includes("nhập hàng")) return false;

      // 3. Tuyệt đối không khớp đơn đã hết hạn theo mốc ngày thực tế
      if (o.expired_at) {
        const expDate = new Date(o.expired_at);
        const now = new Date();
        if (expDate.setHours(0, 0, 0, 0) < now.setHours(0, 0, 0, 0)) {
          return false;
        }
      }

      // 4. KIỂM TRA ĐƠN HÀNG CÓ THUỘC SẢN PHẨM CỦA GÓI NÀY HAY KHÔNG (Chỉ đạo của Master)
      const pkgProductId = r.category_product_id ? Number(r.category_product_id) : null;
      const pkgName = String(r.product_name || r.category || "").trim();
      if (pkgProductId || pkgName) {
        const variant = variantMap.get(String(o.id_product));
        if (variant) {
          let isMatchedProduct = false;
          // Ưu tiên 1: Khớp chính xác 100% bằng product_id hệ thống
          if (pkgProductId && variant.product_id) {
            isMatchedProduct = Number(variant.product_id) === pkgProductId;
          } else if (pkgName) {
            // Ưu tiên 2: Fallback so sánh text nếu chưa có liên kết product_id
            const normalize = (str) =>
              String(str || "")
                .toLowerCase()
                .replace(/[\s\-_]+/g, "");

            const normPkg = normalize(pkgName);
            const normProd = normalize(variant.product_package_name);
            const normDisplay = normalize(variant.display_name);
            const normVariant = normalize(variant.variant_name);

            isMatchedProduct =
              (normProd && (normProd === normPkg || normProd.includes(normPkg) || normPkg.includes(normProd))) ||
              (normDisplay && normDisplay.includes(normPkg)) ||
              (normVariant && normVariant.includes(normPkg));
          }

          if (!isMatchedProduct) {
            return false;
          }
        }
      }

      const targetUser = r.account_info.toLowerCase();
      if (matchRule === "slot") {
        return Boolean(o.slot && String(o.slot).toLowerCase().includes(targetUser));
      }
      if (matchRule === "both") {
        return Boolean(
          (o.information_order && o.information_order.toLowerCase().includes(targetUser)) ||
          (o.slot && String(o.slot).toLowerCase().includes(targetUser))
        );
      }
      return Boolean(o.information_order && o.information_order.toLowerCase().includes(targetUser));
    });

    const totalSlots = parseInt(r.total_slots || 2, 10);
    const usedSlots = Math.min(totalSlots, matchingOrders.length);

    const slotAssignments = matchingOrders.map((ord, idx) => {
      const v = ord.id_product ? variantMap.get(String(ord.id_product)) : null;
      const capacity = extractCapacityFromVariant(v?.variant_name, v?.display_name);

      const targetUser = r.account_info ? String(r.account_info).trim().toLowerCase() : "";
      const isMatchedBySlot = Boolean(ord.slot && String(ord.slot).toLowerCase().includes(targetUser));

      // Chỉ đạo tối cao của Master:
      // Nếu match đơn hàng với cột slot thì lấy ở đây là information, và ngược lại
      let resolvedSlotLabel = `Slot ${idx + 1}`;
      if (isMatchedBySlot) {
        resolvedSlotLabel = ord.information_order || ord.slot || `Slot ${idx + 1}`;
      } else {
        resolvedSlotLabel = ord.slot || ord.information_order || `Slot ${idx + 1}`;
      }

      return {
        slotNumber: idx + 1,
        orderCode: ord.id_order || `ĐƠN #${ord.id}`,
        customerName: ord.customer || "",
        customerContact: ord.contact || "",
        informationOrder: ord.information_order || "",
        orderSlot: ord.slot || "",
        matchedBy: isMatchedBySlot ? "slot" : "information",
        slotLabel: resolvedSlotLabel,
        capacity: capacity || null,
      };
    });

    const capacityLimit = r.storage_total ? parseInt(r.storage_total, 10) : null;
    let capacityUsed = 0;
    if (capacityLimit && capacityLimit > 0) {
      capacityUsed = slotAssignments.reduce((acc, s) => acc + (s.capacity || 0), 0);
    }
    const remainingCapacity = capacityLimit && capacityLimit > 0 ? Math.max(0, capacityLimit - capacityUsed) : null;

        const targetUser = r.account_info ? String(r.account_info).trim().toLowerCase() : "";
        const activeMavn = mavnOrderByAccount.get(targetUser) || null;
        const latestMavn = latestMavnByAccount.get(targetUser) || null;
        const effectiveMavn = activeMavn || latestMavn;
        const todayLog = todayLogMap.get(Number(r.id)) || null;

        // Gói có đơn nhập MAVN: lấy mã đơn từ log hôm nay hoặc đơn active hoặc đơn MAVN gần nhất
        const importOrderCode = todayLog?.import_order_code || activeMavn?.id_order || latestMavn?.id_order || null;
        const hasMavnOrder = Boolean(importOrderCode);

        const costPrice = hasMavnOrder
          ? Number(effectiveMavn?.cost || r.cost_price || 0)
          : parseFloat(r.cost_price || 0);

        const importDays = hasMavnOrder ? Math.max(1, Number(effectiveMavn?.days || 30)) : 30;

        let costPerSlotDay = 0;
        let todayVacantCost = 0;

        // Chỉ tính chi phí slot phát sinh hôm nay nếu đơn MAVN đang còn active
        if (activeMavn && totalSlots > 0 && costPrice > 0) {
          costPerSlotDay = todayLog?.cost_per_slot_day !== undefined
            ? Number(todayLog.cost_per_slot_day)
            : Math.round((costPrice / (totalSlots * importDays)) * 100) / 100;

          const vacantSlots = Math.max(0, totalSlots - usedSlots);
          todayVacantCost = todayLog?.vacant_cost !== undefined
            ? Number(todayLog.vacant_cost)
            : Math.round(vacantSlots * costPerSlotDay * 100) / 100;
        }

        return {
          id: r.id,
          productName: r.product_name || "",
          category: r.category || r.product_name || "Khác",
          requiresStorage: Boolean(r.category_requires_storage),
          name: r.product_name || (r.category ? `${r.category} #${r.id}` : `Gói #${r.id}`),
          accountInfo: r.account_info,
          password: r.password || null,
          twoFa: r.two_fa || null,
          backupEmail: r.backup_email || null,
          storageAccountInfo: r.storage_account_info || null,
          storagePassword: r.storage_password || null,
          storageTwoFa: r.storage_two_fa || null,
          storageBackupEmail: r.storage_backup_email || null,
          storageTotal: r.storage_total || null,
          capacityLimit: capacityLimit || null,
          capacityUsed: capacityLimit ? capacityUsed : null,
          remainingCapacity: capacityLimit ? remainingCapacity : null,
          usedSlots,
          totalSlots,
          supplier: r.supplier,
          costPrice,
          expiredAt: effectiveMavn?.expired_at ? getVietnamDateString(effectiveMavn.expired_at) : null,
          note: r.package_note || "",
          matchRule: r.match_rule || "information",
          status: usedSlots >= totalSlots ? "expired" : usedSlots > 0 ? "warning" : "active",
          slotAssignments,
          costPerSlotDay,
          vacantSlots: Math.max(0, totalSlots - usedSlots),
          todayVacantCost,
          totalAccumulatedVacantCost: Number(accumulatedMap.get(Number(r.id)) || 0),
          importOrderCode,
        };
  });
};

/**
 * Lấy danh mục các Loại Gói từ warehouse.product_names (lọc is_package = true)
 * Bao gồm cờ requires_storage và liên kết product_id với business.product
 */
const getPackageCategories = async () => {
  // 1. Tìm các loại gói đang có trong kho gói warehouse.package_products
  const usedPnRows = await db(TABLES.PACKAGE_PRODUCT).distinct("product_name_id");
  const usedPnIds = usedPnRows
    .map((r) => Number(r.product_name_id))
    .filter((id) => Number.isInteger(id) && id > 0);

  // 2. Chỉ lấy các bản ghi có is_package = true hoặc đang có gói trong kho
  let query = db(TABLES.PRODUCT_NAMES).where("is_package", true);
  if (usedPnIds.length > 0) {
    query = query.orWhereIn("id", usedPnIds);
  }

  const categories = await query.orderBy("name", "asc");

  // 3. Tự động đồng bộ cờ is_package = true và liên kết product_id từ business.product
  const sysProducts = await db(TABLES.PRODUCT).select("id", "package_name");
  const normalize = (str) => String(str || "").toLowerCase().replace(/[\s\-_]+/g, "");

  for (const cat of categories) {
    let shouldUpdate = false;
    const updateData = {};

    if (!cat.is_package) {
      updateData.is_package = true;
      cat.is_package = true;
      shouldUpdate = true;
    }

    if (!cat.product_id) {
      const normCatName = normalize(cat.name);
      const matchedProd = sysProducts.find((p) => {
        const normP = normalize(p.package_name);
        return normP === normCatName || normP.includes(normCatName) || normCatName.includes(normP);
      });
      if (matchedProd) {
        updateData.product_id = matchedProd.id;
        cat.product_id = matchedProd.id;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      await db(TABLES.PRODUCT_NAMES).where("id", cat.id).update(updateData);
    }
  }

  return categories.map((c) => ({
    id: c.id,
    productId: c.product_id ? Number(c.product_id) : null,
    name: c.name,
    isPackage: true,
    requiresStorage: Boolean(c.requires_storage),
  }));
};

/**
 * Tạo mới hoặc cập nhật Loại Gói (đánh dấu is_package = true, requires_storage, và liên kết product_id)
 */
const createPackageCategory = async ({ name, requiresStorage = false }) => {
  const trimmedName = (name || "").trim();
  if (!trimmedName) {
    throw new Error("Tên loại gói không được để trống!");
  }

  // Tự động tìm product_id từ business.product
  const normalize = (str) => String(str || "").toLowerCase().replace(/[\s\-_]+/g, "");
  const normName = normalize(trimmedName);
  const sysProducts = await db(TABLES.PRODUCT).select("id", "package_name");
  const matchedProd = sysProducts.find((p) => {
    const normP = normalize(p.package_name);
    return normP === normName || normP.includes(normName) || normName.includes(normP);
  });
  const linkedProductId = matchedProd ? matchedProd.id : null;

  const existing = await db(TABLES.PRODUCT_NAMES)
    .whereRaw("LOWER(name) = ?", [trimmedName.toLowerCase()])
    .first();

  if (existing) {
    const updateData = {
      is_package: true,
      requires_storage: Boolean(requiresStorage),
      updated_at: db.fn.now(),
    };
    if (linkedProductId && !existing.product_id) {
      updateData.product_id = linkedProductId;
    }

    const [updated] = await db(TABLES.PRODUCT_NAMES)
      .where("id", existing.id)
      .update(updateData)
      .returning("*");

    const result = {
      id: updated.id,
      productId: updated.product_id ? Number(updated.product_id) : null,
      name: updated.name,
      isPackage: Boolean(updated.is_package),
      requiresStorage: Boolean(updated.requires_storage),
    };
    eventBus.emit(EVENTS.PACKAGE_CATEGORY_CREATED, result);
    return result;
  }

  const [inserted] = await db(TABLES.PRODUCT_NAMES)
    .insert({
      name: trimmedName,
      is_package: true,
      requires_storage: Boolean(requiresStorage),
      product_id: linkedProductId,
    })
    .returning("*");

  const result = {
    id: inserted.id,
    productId: inserted.product_id ? Number(inserted.product_id) : null,
    name: inserted.name,
    isPackage: Boolean(inserted.is_package),
    requiresStorage: Boolean(inserted.requires_storage),
  };
  eventBus.emit(EVENTS.PACKAGE_CATEGORY_CREATED, result);
  return result;
};

/**
 * Cập nhật tên Loại Gói và cờ requires_storage trong warehouse.product_names
 */
const updatePackageCategory = async ({ oldName, newName, requiresStorage }) => {
  const trimmedNew = (newName || oldName || "").trim();
  const trimmedOld = (oldName || "").trim();
  if (!trimmedNew) throw new Error("Tên loại gói mới không được để trống!");
  if (!trimmedOld) throw new Error("Tên loại gói cũ không hợp lệ!");

  const existing = await db(TABLES.PRODUCT_NAMES)
    .whereRaw("LOWER(name) = ?", [trimmedOld.toLowerCase()])
    .first();

  if (!existing) {
    throw new Error(`Không tìm thấy loại gói '${trimmedOld}'`);
  }

  const updateFields = {
    name: trimmedNew,
    is_package: true,
    updated_at: db.fn.now(),
  };
  if (requiresStorage !== undefined) {
    updateFields.requires_storage = Boolean(requiresStorage);
  }

  // Tự động cập nhật product_id nếu đổi tên sang sản phẩm khác
  if (trimmedNew.toLowerCase() !== trimmedOld.toLowerCase()) {
    const normalize = (str) => String(str || "").toLowerCase().replace(/[\s\-_]+/g, "");
    const normNew = normalize(trimmedNew);
    const sysProducts = await db(TABLES.PRODUCT).select("id", "package_name");
    const matchedProd = sysProducts.find((p) => {
      const normP = normalize(p.package_name);
      return normP === normNew || normP.includes(normNew) || normNew.includes(normP);
    });
    if (matchedProd) {
      updateFields.product_id = matchedProd.id;
    }
  }

  const [updated] = await db(TABLES.PRODUCT_NAMES)
    .where("id", existing.id)
    .update(updateFields)
    .returning("*");

  const result = {
    id: updated.id,
    productId: updated.product_id ? Number(updated.product_id) : null,
    name: updated.name,
    isPackage: Boolean(updated.is_package),
    requiresStorage: Boolean(updated.requires_storage),
  };

  eventBus.emit(EVENTS.PACKAGE_CATEGORY_UPDATED, result);

  return result;
};

/**
 * Xóa mềm Loại Gói (đặt is_package = false)
 */
const deletePackageCategory = async (nameOrId) => {
  if (!nameOrId) throw new Error("ID hoặc Tên loại gói không được để trống!");

  let query = db(TABLES.PRODUCT_NAMES);
  if (!isNaN(Number(nameOrId))) {
    query = query.where("id", Number(nameOrId));
  } else {
    query = query.whereRaw("LOWER(name) = ?", [String(nameOrId).trim().toLowerCase()]);
  }

  const existing = await query.first();
  if (!existing) {
    throw new Error(`Không tìm thấy loại gói '${nameOrId}'!`);
  }

  const [updated] = await db(TABLES.PRODUCT_NAMES)
    .where("id", existing.id)
    .update({
      is_package: false,
      updated_at: db.fn.now(),
    })
    .returning("*");

  const result = {
    success: true,
    id: updated.id,
    name: updated.name,
    isPackage: false,
  };

  eventBus.emit(EVENTS.PACKAGE_CATEGORY_DELETED, result);

  return result;
};

/**
 * Helper tìm hoặc tạo tài khoản kho trong warehouse.accounts
 */
const findOrCreateAccount = async (accountUsername) => {
  const trimmed = (accountUsername || "").trim();
  if (!trimmed) return null;

  const existing = await db(TABLES.PRODUCT_KEYS)
    .whereRaw("LOWER(account_username) = ?", [trimmed.toLowerCase()])
    .first();

  if (existing) return existing;

  const [created] = await db(TABLES.PRODUCT_KEYS)
    .insert({
      account_username: trimmed,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning("*");

  return created;
};

/**
 * Thêm mới Gói Sản Phẩm (Kho Gói Sản Phẩm)
 * Hỗ trợ tài khoản gốc (account_id) và tài khoản liên kết (storage_account_id / storage_total)
 */
const createPackageProduct = async (payload) => {
  const {
    name,
    category,
    accountInfo,
    accountUsername,
    storageAccountInfo,
    storageAccountUsername,
    storageTotal,
    supplier = "Mavryk",
    costPrice = 0,
    totalSlots = 2,
    note = "",
  } = payload;

  const mainAccUser = accountUsername || accountInfo;
  if (!mainAccUser || !mainAccUser.trim()) {
    throw new Error("Thông tin tài khoản gốc không được để trống!");
  }

  const catName = (category || name || "").trim();
  if (!catName) {
    throw new Error("Loại gói sản phẩm không được để trống!");
  }

  // 1. Tìm hoặc tạo product_name_id trong warehouse.product_names
  let pnRecord = await db(TABLES.PRODUCT_NAMES)
    .whereRaw("LOWER(name) = ?", [catName.toLowerCase()])
    .first();

  if (!pnRecord) {
    const [createdPn] = await db(TABLES.PRODUCT_NAMES)
      .insert({
        name: catName,
        is_package: true,
        requires_storage: Boolean(storageAccountUsername || storageAccountInfo),
      })
      .returning("*");
    pnRecord = createdPn;
  }

  // 2. Tìm hoặc tạo Tài khoản gốc trong warehouse.accounts
  const mainAccount = await findOrCreateAccount(mainAccUser);

  // 3. Tìm hoặc tạo Tài khoản dung lượng/liên kết (nếu có)
  const storageAccUser = storageAccountUsername || storageAccountInfo;
  let storageAccount = null;
  if (storageAccUser && storageAccUser.trim()) {
    storageAccount = await findOrCreateAccount(storageAccUser);
  }

  // 4. Insert vào warehouse.package_products
  const [inserted] = await db(TABLES.PACKAGE_PRODUCT)
    .insert({
      product_name_id: pnRecord.id,
      account_id: mainAccount.id,
      supplier: supplier || "Mavryk",
      cost: parseFloat(costPrice || 0),
      slot: parseInt(totalSlots || 2, 10),
      package_note: note || null,
      storage_account_id: storageAccount ? storageAccount.id : null,
      storage_total: storageTotal || null,
      match_rule: payload.matchRule || "information",
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning("*");

  const resultItem = {
    id: inserted.id,
    productName: pnRecord.name,
    category: pnRecord.name,
    requiresStorage: Boolean(pnRecord.requires_storage),
    name: name || pnRecord.name,
    accountInfo: mainAccount.account_username,
    storageAccountInfo: storageAccount ? storageAccount.account_username : null,
    storageTotal: inserted.storage_total || null,
    usedSlots: 0,
    totalSlots: inserted.slot,
    supplier: inserted.supplier,
    costPrice: parseFloat(inserted.cost || 0),
    expiredAt: payload.expiredAt || null,
    note: inserted.package_note || "",
    matchRule: inserted.match_rule || "information",
    status: "active",
    slotAssignments: [],
  };

  eventBus.emit(EVENTS.PACKAGE_PRODUCT_CREATED, resultItem);
  return resultItem;
};

/**
 * Cập nhật Gói Sản Phẩm trong warehouse.package_products
 */
const updatePackageProduct = async (id, payload) => {
  const pkgId = parseInt(id, 10);
  if (!pkgId) throw new Error("ID gói không hợp lệ!");

  const existing = await db(TABLES.PACKAGE_PRODUCT).where("id", pkgId).first();
  if (!existing) throw new Error(`Không tìm thấy gói sản phẩm #${pkgId}`);

  const {
    name,
    category,
    accountInfo,
    accountUsername,
    storageAccountInfo,
    storageAccountUsername,
    storageTotal,
    matchRule,
    supplier,
    costPrice,
    totalSlots,
    note,
  } = payload;

  const updateFields = {
    updated_at: db.fn.now(),
  };

  let targetPnRecord = null;
  if (category) {
    targetPnRecord = await db(TABLES.PRODUCT_NAMES)
      .whereRaw("LOWER(name) = ?", [category.trim().toLowerCase()])
      .first();
    if (!targetPnRecord) {
      const [created] = await db(TABLES.PRODUCT_NAMES)
        .insert({ name: category.trim(), is_package: true })
        .returning("*");
      targetPnRecord = created;
    }
    updateFields.product_name_id = targetPnRecord.id;
  }

  const mainAccUser = accountUsername || accountInfo;
  if (mainAccUser && mainAccUser.trim()) {
    const mainAcc = await findOrCreateAccount(mainAccUser);
    updateFields.account_id = mainAcc.id;
  }

  const storageAccUser = storageAccountUsername !== undefined ? storageAccountUsername : storageAccountInfo;
  if (storageAccUser !== undefined) {
    if (storageAccUser && storageAccUser.trim()) {
      const storageAcc = await findOrCreateAccount(storageAccUser);
      updateFields.storage_account_id = storageAcc.id;
    } else {
      updateFields.storage_account_id = null;
    }
  }

  if (storageTotal !== undefined) updateFields.storage_total = storageTotal || null;
  if (matchRule !== undefined) updateFields.match_rule = matchRule || "information";
  if (supplier !== undefined) updateFields.supplier = supplier;
  if (costPrice !== undefined) updateFields.cost = parseFloat(costPrice || 0);
  if (totalSlots !== undefined) updateFields.slot = parseInt(totalSlots || 2, 10);
  if (note !== undefined) updateFields.package_note = note;

  const [updated] = await db(TABLES.PACKAGE_PRODUCT)
    .where("id", pkgId)
    .update(updateFields)
    .returning("*");

  const mainAcc = await db(TABLES.PRODUCT_KEYS).where("id", updated.account_id).first();
  const storageAcc = updated.storage_account_id
    ? await db(TABLES.PRODUCT_KEYS).where("id", updated.storage_account_id).first()
    : null;
  const pn = await db(TABLES.PRODUCT_NAMES).where("id", updated.product_name_id).first();

  const resultItem = {
    id: updated.id,
    productName: pn ? pn.name : "",
    category: pn ? pn.name : category || "Khác",
    requiresStorage: Boolean(pn?.requires_storage),
    name: name || (pn ? pn.name : `Gói #${updated.id}`),
    accountInfo: mainAcc ? mainAcc.account_username : "",
    storageAccountInfo: storageAcc ? storageAcc.account_username : null,
    storageTotal: updated.storage_total || null,
    usedSlots: payload.usedSlots !== undefined ? payload.usedSlots : 0,
    totalSlots: updated.slot,
    supplier: updated.supplier,
    costPrice: parseFloat(updated.cost || 0),
    expiredAt: payload.expiredAt || null,
    note: updated.package_note || "",
    matchRule: updated.match_rule || "information",
    status: (payload.usedSlots || 0) >= updated.slot ? "expired" : "active",
  };

  eventBus.emit(EVENTS.PACKAGE_PRODUCT_UPDATED, resultItem);
  return resultItem;
};

/**
 * Xóa Gói Sản Phẩm khỏi warehouse.package_products
 */
const deletePackageProduct = async (id) => {
  const pkgId = parseInt(id, 10);
  if (!pkgId) throw new Error("ID gói không hợp lệ!");

  const existing = await db(TABLES.PACKAGE_PRODUCT).where("id", pkgId).first();
  if (!existing) throw new Error(`Không tìm thấy gói sản phẩm #${pkgId}`);

  await db(TABLES.PACKAGE_PRODUCT).where("id", pkgId).del();

  const result = {
    success: true,
    id: pkgId,
  };

  eventBus.emit(EVENTS.PACKAGE_PRODUCT_DELETED, result);
  return result;
};

/**
 * Lấy toàn bộ danh sách tên sản phẩm trong bảng Master Catalog (warehouse.product_names)
 */
const getAllCatalogProductNames = async () => {
  const list = await db(TABLES.PRODUCT)
    .select("id", "package_name as name", "is_active")
    .where("is_active", true)
    .orderBy("package_name", "asc");

  return list.map((item) => ({
    id: item.id,
    name: item.name,
    isPackage: true,
    loginUrl: null,
  }));
};


module.exports = {
  getPackageProducts,
  getPackageCategories,
  getAllCatalogProductNames,
  createPackageCategory,
  updatePackageCategory,
  deletePackageCategory,
  createPackageProduct,
  updatePackageProduct,
  deletePackageProduct,
};
