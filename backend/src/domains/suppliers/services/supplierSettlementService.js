const { TABLES, COLS } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { SUPPLIER_PAYMENT_STATUS } = require("@/constants/supplierStatus");
const {
  RECEIPT_STATUS,
  ALLOCATION_TYPE,
  ALLOCATION_CREATOR,
} = require("@/constants/receiptStatus");

const SUPPLIER_COLS = COLS.SUPPLIER;
const LOG_COLS = COLS.SUPPLIER_ORDER_COST_LOG;

const toAmount = (value) => Math.round(Number(value) || 0);

const appendAuditNote = (currentNote, auditNote) =>
  [String(currentNote || "").trim(), auditNote].filter(Boolean).join(" | ");

async function settleSupplierDebtTransaction({
  trx,
  supplierId,
  receiptId,
  bankPaidAmount,
  source = "MANUAL",
}) {
  const numericSupplierId = Number(supplierId);
  const numericReceiptId = Number(receiptId);
  const paidAmount = toAmount(bankPaidAmount);

  if (!trx) throw new Error("Transaction là bắt buộc khi tất toán công nợ NCC.");
  if (!numericSupplierId) throw new Error("ID nhà cung cấp không hợp lệ.");
  if (!numericReceiptId) throw new Error("ID biên lai không hợp lệ.");

  const supplier = await trx(TABLES.SUPPLIER)
    .where({ [SUPPLIER_COLS.ID]: numericSupplierId })
    .forUpdate()
    .first();
  if (!supplier) throw new Error("Không tìm thấy nhà cung cấp.");

  const receipt = await trx(TABLES.PAYMENT_RECEIPT)
    .where({ id: numericReceiptId })
    .forUpdate()
    .first();
  if (!receipt) throw new Error("Không tìm thấy biên lai thanh toán.");

  const existingAllocation = await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS)
    .where({
      receipt_id: numericReceiptId,
      allocation_type: ALLOCATION_TYPE.SUPPLIER,
      target_code: `NCC-${numericSupplierId}`,
    })
    .first();
  if (existingAllocation) {
    return {
      settled: true,
      duplicate: true,
      supplier,
      receiptId: numericReceiptId,
      bankPaidAmount: toAmount(existingAllocation.amount),
    };
  }

  const unpaidLogs = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
    .where({
      [LOG_COLS.SUPPLY_ID]: numericSupplierId,
      [LOG_COLS.NCC_PAYMENT_STATUS]: SUPPLIER_PAYMENT_STATUS.UNPAID,
    })
    .forUpdate();

  const settledDebt = unpaidLogs.reduce(
    (total, log) => total + toAmount(log[LOG_COLS.IMPORT_COST]) - toAmount(log[LOG_COLS.REFUND_AMOUNT]),
    0
  );

  if (settledDebt <= 0) {
    return {
      settled: false,
      alreadySettled: true,
      supplier,
      receiptId: numericReceiptId,
      settledDebt: 0,
      bankPaidAmount: 0,
    };
  }

  const suffixAmount = numericSupplierId;
  const expectedBankPaidAmount = Math.max(0, settledDebt - suffixAmount);
  if (expectedBankPaidAmount <= 0) {
    throw new Error("Công nợ NCC phải lớn hơn suffix ID để ghi nhận thanh toán qua ngân hàng.");
  }  if (paidAmount !== expectedBankPaidAmount) {
    throw new Error(
      `Số tiền thanh toán NCC không khớp: cần ${expectedBankPaidAmount.toLocaleString("vi-VN")} đ, nhận ${paidAmount.toLocaleString("vi-VN")} đ.`
    );
  }

  const availableAmount = toAmount(receipt.unallocated_amount ?? receipt.amount);
  if (availableAmount < paidAmount) {
    throw new Error("Biên lai không đủ số dư để tất toán công nợ NCC.");
  }

  const auditNote = `NCC${numericSupplierId} | settledDebt=${settledDebt} | bankPaidAmount=${paidAmount} | suffixAmount=${suffixAmount}`;
  const receiver = supplier[SUPPLIER_COLS.NUMBER_BANK]
    ? `${supplier[SUPPLIER_COLS.SUPPLIER_NAME]} (${supplier[SUPPLIER_COLS.NUMBER_BANK]})`
    : supplier[SUPPLIER_COLS.SUPPLIER_NAME];

  await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
    .where({
      [LOG_COLS.SUPPLY_ID]: numericSupplierId,
      [LOG_COLS.NCC_PAYMENT_STATUS]: SUPPLIER_PAYMENT_STATUS.UNPAID,
    })
    .update({ [LOG_COLS.NCC_PAYMENT_STATUS]: SUPPLIER_PAYMENT_STATUS.PAID });

  await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).insert({
    receipt_id: numericReceiptId,
    allocation_type: ALLOCATION_TYPE.SUPPLIER,
    target_code: `NCC-${numericSupplierId}`,
    amount: paidAmount,
    remaining_balance: 0,
    note: `Tất toán công nợ NCC từ ${source}: ${auditNote}`,
    created_by: source === "WEBHOOK" ? ALLOCATION_CREATOR.SYSTEM_WEBHOOK : ALLOCATION_CREATOR.ADMIN,
  });

  await trx(TABLES.PAYMENT_RECEIPT)
    .where({ id: numericReceiptId })
    .update({
      receiver,
      status: RECEIPT_STATUS.FULLY_ALLOCATED,
      unallocated_amount: 0,
      note: appendAuditNote(receipt.note, auditNote),
    });

  trx.afterCommit(() => eventBus.emit(EVENTS.SUPPLIER_DEBT_PAID, {
    id: numericSupplierId,
    supplier_name: supplier[SUPPLIER_COLS.SUPPLIER_NAME],
    amount: paidAmount,
    settledDebt,
    suffixAmount,
    receiptId: numericReceiptId,
    summary: `Đã thanh toán công nợ NCC "${supplier[SUPPLIER_COLS.SUPPLIER_NAME]}" (${paidAmount.toLocaleString("vi-VN")} đ; NCC${numericSupplierId})`,
  }));

  return {
    settled: true,
    supplier,
    receiptId: numericReceiptId,
    settledDebt,
    bankPaidAmount: paidAmount,
    suffixAmount,
  };
}

module.exports = { settleSupplierDebtTransaction };