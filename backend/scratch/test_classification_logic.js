require("module-alias/register");
const { db } = require("../src/db");
const { TABLES, PAYMENT_RECEIPT_DEF } = require("../src/domains/payments/controller/shared/constants");

async function test() {
  try {
    const flowTypes = await db(TABLES.receiptFlowTypes).where("is_active", true);
    console.log("FLOW TYPES IN DB:");
    console.log(flowTypes.map(f => ({ id: f.id, code: f.code, label: f.label, direction: f.direction })));

    const outboundFlowType = flowTypes.find(f => f.direction === "out");
    const inboundFlowType = flowTypes.find(f => f.direction === "in");

    if (!outboundFlowType || !inboundFlowType) {
      console.error("Could not find flow types to test.");
      process.exit(1);
    }

    console.log(`Outbound flow type: id=${outboundFlowType.id}, label=${outboundFlowType.label}`);
    console.log(`Inbound flow type: id=${inboundFlowType.id}, label=${inboundFlowType.label}`);

    const validate = (receiptRow, flowType) => {
      const amount = Number(receiptRow[PAYMENT_RECEIPT_DEF.columns.amount]) || 0;
      const transferType = String(receiptRow[PAYMENT_RECEIPT_DEF.columns.transferType] || "").trim().toLowerCase();
      const isOutbound = transferType === "out" || amount < 0;

      if (flowType.direction === "in" && isOutbound) {
        throw new Error(`Loại phân loại '${flowType.label}' chỉ dành cho giao dịch nhận tiền (Inbound).`);
      }
      if (flowType.direction === "out" && !isOutbound) {
        throw new Error(`Loại phân loại '${flowType.label}' chỉ dành cho giao dịch chi tiền (Outbound).`);
      }
      return "SUCCESS";
    };

    const receipt1 = {
      [PAYMENT_RECEIPT_DEF.columns.amount]: 500000,
      [PAYMENT_RECEIPT_DEF.columns.transferType]: "out"
    };
    
    console.log("\n--- TEST CASE 1: Positive amount, transfer_type = 'out' ---");
    try {
      const res = validate(receipt1, outboundFlowType);
      console.log("Outbound Classification:", res);
    } catch (e) {
      console.log("Outbound Classification FAILED:", e.message);
    }
    try {
      const res = validate(receipt1, inboundFlowType);
      console.log("Inbound Classification:", res);
    } catch (e) {
      console.log("Inbound Classification REJECTED (Expected):", e.message);
    }

    const receipt2 = {
      [PAYMENT_RECEIPT_DEF.columns.amount]: 500000,
      [PAYMENT_RECEIPT_DEF.columns.transferType]: "in"
    };

    console.log("\n--- TEST CASE 2: Positive amount, transfer_type = 'in' ---");
    try {
      const res = validate(receipt2, outboundFlowType);
      console.log("Outbound Classification:", res);
    } catch (e) {
      console.log("Outbound Classification REJECTED (Expected):", e.message);
    }
    try {
      const res = validate(receipt2, inboundFlowType);
      console.log("Inbound Classification:", res);
    } catch (e) {
      console.log("Inbound Classification FAILED:", e.message);
    }

    const receipt3 = {
      [PAYMENT_RECEIPT_DEF.columns.amount]: -500000,
      [PAYMENT_RECEIPT_DEF.columns.transferType]: ""
    };

    console.log("\n--- TEST CASE 3: Negative amount, transfer_type = empty ---");
    try {
      const res = validate(receipt3, outboundFlowType);
      console.log("Outbound Classification:", res);
    } catch (e) {
      console.log("Outbound Classification FAILED:", e.message);
    }
    try {
      const res = validate(receipt3, inboundFlowType);
      console.log("Inbound Classification:", res);
    } catch (e) {
      console.log("Inbound Classification REJECTED (Expected):", e.message);
    }

    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

test();
