const logger = require("../../../utils/logger");
const {
  NCC_STATUS_UNPAID,
  NCC_STATUS_PAID,
  findLatestCostLog,
  updateOrderSupplyAndCost,
  deleteCostLogById,
  updateLatestCostLog,
  insertCostLog,
} = require("../repository");
const { FLOWS, STATUSES_NEEDING_NCC_LOG } = require("./constants");
const { applyProfitDeltaOnCostChange } = require("./summary");

async function insertMavrykMarkerLog(trx, { orderId, mavrykSupplyId, idOrderText }) {
  await insertCostLog(trx, {
    orderListId: orderId,
    supplyId: mavrykSupplyId,
    idOrder: idOrderText,
    importCost: 0,
    refundAmount: 0,
    nccPaymentStatus: NCC_STATUS_PAID,
  });
}

async function runFlowA(
  trx,
  { orderId, newSupplyId, newCost, oldCost, isNewMavryk, orderStatus, idOrderText, monthKey }
) {
  await updateOrderSupplyAndCost(trx, orderId, {
    supplyId: newSupplyId,
    cost: newCost,
  });

  const profitDelta = await applyProfitDeltaOnCostChange(trx, {
    orderId,
    oldCost,
    newCost,
    orderStatus,
    monthKey,
  });

  if (isNewMavryk) {
    await trx.raw(
      `DELETE FROM partner.supplier_order_cost_log WHERE order_list_id = ?`,
      [orderId]
    );
    const needsMarker = STATUSES_NEEDING_NCC_LOG.has(orderStatus);
    if (needsMarker) {
      await insertMavrykMarkerLog(trx, {
        orderId,
        mavrykSupplyId: newSupplyId,
        idOrderText,
      });
    }
    return {
      flow: FLOWS.A,
      orderId,
      oldCost,
      newCost,
      profitDelta,
      mavrykNew: true,
      insertedLog: needsMarker,
      message: needsMarker
        ? "Flow A (≤5 ngày): NCC mới Mavryk → xóa log cũ + tạo marker (import=0) + bù profit delta."
        : "Flow A (≤5 ngày): NCC mới Mavryk → xóa log cũ (status không cần log).",
    };
  }

  const latestLog = await findLatestCostLog(trx, orderId);
  if (latestLog) {
    await updateLatestCostLog(trx, latestLog.id, {
      supplyId: newSupplyId,
      importCost: newCost,
    });
    logger.info("[supplier-change] Flow A: updated existing log", {
      orderId,
      logId: latestLog.id,
      newSupplyId,
      newCost,
    });
    return {
      flow: FLOWS.A,
      orderId,
      oldCost,
      newCost,
      profitDelta,
      mavrykNew: false,
      insertedLog: false,
      message: "Flow A (≤5 ngày): cập nhật cost + đồng bộ log cost mới nhất + bù profit delta.",
    };
  }

  const needsLog = STATUSES_NEEDING_NCC_LOG.has(orderStatus);
  if (needsLog) {
    await insertCostLog(trx, {
      orderListId: orderId,
      supplyId: newSupplyId,
      idOrder: idOrderText,
      importCost: newCost,
      refundAmount: 0,
      nccPaymentStatus: NCC_STATUS_UNPAID,
    });
    logger.info("[supplier-change] Flow A: inserted new log (old NCC = Mavryk?)", {
      orderId,
      newSupplyId,
      newCost,
      orderStatus,
    });
    return {
      flow: FLOWS.A,
      orderId,
      oldCost,
      newCost,
      profitDelta,
      mavrykNew: false,
      insertedLog: true,
      message:
        "Flow A (≤5 ngày): không có log cũ (NCC cũ là Mavryk?) — tạo log mới cho NCC mới + bù profit delta để dashboard tính đúng.",
    };
  }

  logger.info(
    "[supplier-change] Flow A: status không cần log NCC → chỉ update order.cost",
    { orderId, orderStatus, expectedStatuses: Array.from(STATUSES_NEEDING_NCC_LOG) }
  );
  return {
    flow: FLOWS.A,
    orderId,
    oldCost,
    newCost,
    profitDelta,
    mavrykNew: false,
    insertedLog: false,
    message: `Flow A (≤5 ngày): cập nhật cost; đơn ở status "${orderStatus}" không cần log NCC (không bù profit).`,
  };
}

async function runFlowBUnpaid(
  trx,
  {
    orderId,
    newSupplyId,
    newCost,
    oldCost,
    isNewMavryk,
    latestLog,
    idOrderText,
    orderStatus,
    monthKey,
  }
) {
  await deleteCostLogById(trx, latestLog.id);

  await updateOrderSupplyAndCost(trx, orderId, {
    supplyId: newSupplyId,
    cost: newCost,
  });

  const profitDelta = await applyProfitDeltaOnCostChange(trx, {
    orderId,
    oldCost,
    newCost,
    orderStatus,
    monthKey,
  });

  if (isNewMavryk) {
    await insertMavrykMarkerLog(trx, {
      orderId,
      mavrykSupplyId: newSupplyId,
      idOrderText,
    });
  } else {
    await insertCostLog(trx, {
      orderListId: orderId,
      supplyId: newSupplyId,
      idOrder: idOrderText,
      importCost: newCost,
      refundAmount: 0,
      nccPaymentStatus: NCC_STATUS_UNPAID,
    });
  }

  return {
    flow: FLOWS.B_UNPAID,
    orderId,
    oldCost,
    newCost,
    profitDelta,
    deletedLogId: latestLog.id,
    insertedNewLog: true,
    mavrykNew: isNewMavryk,
    message: isNewMavryk
      ? "Flow B (Chưa TT): xóa log cũ + Mavryk marker + bù profit delta."
      : "Flow B (Chưa TT): xóa log cũ + log mới NCC + bù profit delta.",
  };
}

async function runFlowBPaid(
  trx,
  {
    orderId,
    oldSupplyId,
    newSupplyId,
    newCost,
    oldCost,
    isNewMavryk,
    refundFromOld,
    idOrderText,
    orderStatus,
    monthKey,
  }
) {
  if (refundFromOld > 0 && oldSupplyId != null) {
    await insertCostLog(trx, {
      orderListId: orderId,
      supplyId: oldSupplyId,
      idOrder: idOrderText,
      importCost: 0,
      refundAmount: refundFromOld,
      nccPaymentStatus: NCC_STATUS_UNPAID,
    });
  }

  await updateOrderSupplyAndCost(trx, orderId, {
    supplyId: newSupplyId,
    cost: newCost,
  });

  const profitDelta = await applyProfitDeltaOnCostChange(trx, {
    orderId,
    oldCost,
    newCost,
    orderStatus,
    monthKey,
  });

  if (isNewMavryk) {
    await insertMavrykMarkerLog(trx, {
      orderId,
      mavrykSupplyId: newSupplyId,
      idOrderText,
    });
  } else {
    await insertCostLog(trx, {
      orderListId: orderId,
      supplyId: newSupplyId,
      idOrder: idOrderText,
      importCost: newCost,
      refundAmount: 0,
      nccPaymentStatus: NCC_STATUS_UNPAID,
    });
  }

  return {
    flow: FLOWS.B_PAID,
    orderId,
    oldCost,
    newCost,
    profitDelta,
    refundFromOldNcc: refundFromOld,
    insertedNewLog: true,
    mavrykNew: isNewMavryk,
    message: isNewMavryk
      ? "Flow B (Đã TT): giữ log cũ + log hoàn + Mavryk marker + bù profit delta."
      : "Flow B (Đã TT): giữ log cũ + log hoàn + log NCC mới + bù profit delta.",
  };
}

module.exports = {
  runFlowA,
  runFlowBUnpaid,
  runFlowBPaid,
};
