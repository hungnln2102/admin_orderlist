#!/usr/bin/env node

/**
 * Manual integration test suite for the new Order → Payment Slot → SePay webhook → Event/Notification flow.
 *
 * What it validates:
 *  1. New unpaid order with an opened payment slot is resolved by expected amount + receiver account.
 *  2. Duplicate SePay transaction is idempotent.
 *  3. Wrong amount does not match the pending slot/order.
 *  4. Superseded slot is ignored; the latest pending slot is accepted.
 *  5. Order deletion notification event is emitted with the expected payload.
 *
 * Each case runs 5 times by default.
 *
 * Usage:
 *   node tests/manual/run-sepay-order-notification-flow-tests.js
 *   SEPAY_FLOW_TEST_RUNS=3 node tests/manual/run-sepay-order-notification-flow-tests.js
 *
 * Safety:
 *  - Uses order codes prefixed with IT-SEPAY-FLOW-.
 *  - Cleans up only rows created by this script.
 *  - Requires at least one existing order row as an INSERT template so the script can satisfy project-specific
 *    NOT NULL/FK columns without hardcoding the full production schema.
 */

process.env.NODE_ENV = process.env.NODE_ENV || "test";

const assert = require("assert/strict");
const crypto = require("crypto");

const {
    pool,
    ORDER_TABLE,
    ORDER_COLS,
    PAYMENT_RECEIPT_TABLE,
    PAYMENT_RECEIPT_COLS,
} = require("../../webhook/sepay/config");
const { STATUS } = require("@/utils/statuses");
const { openPaymentSlot } = require("@/domains/payment-slots/use-cases/openPaymentSlot");
const { parseWebhookTransaction } = require("../../webhook/sepay/routes/webhook/parsePhase");
const { processWebhookTransactionAsync } = require("../../webhook/sepay/routes/webhook/postHandler");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");

const RUNS_PER_CASE = Number(process.env.SEPAY_FLOW_TEST_RUNS || 5);
const TEST_PREFIX = "MAVITFLOW";
const RECEIVER_ACCOUNT = String(process.env.SEPAY_FLOW_TEST_RECEIVER || "970422TESTFLOW").trim();
const SLOTS_TABLE = "orders.order_payment_slots";

const safeIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;

const splitQualifiedTable = (qualified) => {
    const cleaned = String(qualified || "").replace(/"/g, "");
    const parts = cleaned.split(".");
    if (parts.length === 2) return { schema: parts[0], table: parts[1] };
    return { schema: "public", table: parts[0] };
};

const orderTableParts = splitQualifiedTable(ORDER_TABLE);
const receiptTableParts = splitQualifiedTable(PAYMENT_RECEIPT_TABLE);

function uniqueCode(label, run) {
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const normalizedLabel = String(label || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    return `${TEST_PREFIX}${normalizedLabel}${run}${suffix}`;
}

function todayYmd() {
    return new Date().toISOString().slice(0, 10);
}

function nextYearYmd() {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
}

function makeSepayPayload({
    transactionId,
    referenceCode,
    amount,
    receiverAccount = RECEIVER_ACCOUNT,
    content,
    transferType = "in",
}) {
    return {
        id: transactionId,
        transaction_id: transactionId,
        referenceCode,
        reference_code: referenceCode,
        transferType,
        transfer_type: transferType,
        transfer_amount: amount,
        amount_in: amount,
        account_number: receiverAccount,
        sub_account: receiverAccount,
        transaction_content: content || "Thanh toan QR",
        note: content || "Thanh toan QR",
        description: content || "Thanh toan QR",
        transaction_date: `${todayYmd()} 09:00:00`,
    };
}

function normalizeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

async function getColumns(client, qualifiedTable) {
    const parts = splitQualifiedTable(qualifiedTable);
    const { rows } = await client.query(
        `
      SELECT column_name, data_type, udt_name, is_nullable, column_default, is_identity
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
      ORDER BY ordinal_position
    `,
        [parts.schema, parts.table]
    );
    if (!rows.length) {
        throw new Error(`Không tìm thấy metadata cột cho ${qualifiedTable}`);
    }
    return rows;
}

async function getOrderRowCount(client) {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM ${ORDER_TABLE}`);
    return Number(rows[0]?.n || 0);
}

async function cloneOrderFromTemplate(client, { orderCode, price, status = STATUS.UNPAID, cost = 0 }) {
    const columns = await getColumns(client, ORDER_TABLE);
    const columnNames = columns
        .filter((col) => {
            const name = col.column_name;
            if (col.is_identity === "YES") return false;
            if (name === ORDER_COLS.id) return false;
            if (name === "id") return false;
            if (/^created_?at$/i.test(name)) return false;
            if (/^updated_?at$/i.test(name)) return false;
            return true;
        })
        .map((col) => col.column_name);

    const templateCount = await getOrderRowCount(client);
    if (templateCount <= 0) {
        throw new Error(
            "Không có đơn hàng template trong DB. Hãy seed ít nhất 1 order trước khi chạy integration test này."
        );
    }

    const overrideByColumn = new Map([
        [ORDER_COLS.idOrder, "$1"],
        [ORDER_COLS.status, "$2"],
        [ORDER_COLS.price, "$3::numeric"],
        [ORDER_COLS.grossSellingPrice, "$4::numeric"],
        [ORDER_COLS.cost, "$5::numeric"],
        [ORDER_COLS.orderDate, "$6::date"],
        [ORDER_COLS.expiryDate, "$7::date"],
        [ORDER_COLS.customer, "$8"],
        [ORDER_COLS.contact, "$9"],
    ]);

    const selectExpressions = columnNames.map((name) => {
        const override = overrideByColumn.get(name);
        return override ? `${override} AS ${safeIdent(name)}` : safeIdent(name);
    });

    await client.query(
        `
      INSERT INTO ${ORDER_TABLE} (${columnNames.map(safeIdent).join(", ")})
      SELECT ${selectExpressions.join(", ")}
      FROM ${ORDER_TABLE}
      WHERE COALESCE(${safeIdent(ORDER_COLS.idOrder)}::text, '') NOT LIKE '${TEST_PREFIX}%'
      ORDER BY ${safeIdent(ORDER_COLS.id)} ASC
      LIMIT 1
    `,
        [
            orderCode,
            status,
            price,
            price,
            cost,
            todayYmd(),
            nextYearYmd(),
            `Integration ${orderCode}`,
            "integration@example.test",
        ]
    );

    const { rows } = await client.query(
        `
      SELECT *
      FROM ${ORDER_TABLE}
      WHERE LOWER(${safeIdent(ORDER_COLS.idOrder)}::text) = LOWER($1)
      LIMIT 1
    `,
        [orderCode]
    );
    assert.equal(rows.length, 1, `Không tạo được order test ${orderCode}`);
    return rows[0];
}

async function fetchOrder(client, orderCode) {
    const { rows } = await client.query(
        `
      SELECT *
      FROM ${ORDER_TABLE}
      WHERE LOWER(${safeIdent(ORDER_COLS.idOrder)}::text) = LOWER($1)
      LIMIT 1
    `,
        [orderCode]
    );
    return rows[0] || null;
}

async function fetchSlots(client, orderCode) {
    const { rows } = await client.query(
        `
      SELECT *
      FROM ${SLOTS_TABLE}
      WHERE LOWER(id_order::text) = LOWER($1)
      ORDER BY cycle_index ASC, id ASC
    `,
        [orderCode]
    );
    return rows;
}

async function fetchReceiptsForOrder(client, orderCode) {
    const orderCodeColumn =
        PAYMENT_RECEIPT_COLS.idOrder ||
        PAYMENT_RECEIPT_COLS.orderCode ||
        PAYMENT_RECEIPT_COLS.id_order ||
        "id_order";

    const { rows } = await client.query(
        `
      SELECT *
      FROM ${PAYMENT_RECEIPT_TABLE}
      WHERE LOWER(COALESCE(${safeIdent(orderCodeColumn)}::text, '')) = LOWER($1)
      ORDER BY ${safeIdent(PAYMENT_RECEIPT_COLS.id)} ASC
    `,
        [orderCode]
    );
    return rows;
}

async function fetchReceiptsByTransactionId(client, transactionId) {
    const txnCol = PAYMENT_RECEIPT_COLS.sepayTransactionId;
    if (!txnCol) return [];
    const { rows } = await client.query(
        `
      SELECT *
      FROM ${PAYMENT_RECEIPT_TABLE}
      WHERE ${safeIdent(txnCol)}::text = $1
      ORDER BY ${safeIdent(PAYMENT_RECEIPT_COLS.id)} ASC
    `,
        [transactionId]
    );
    return rows;
}

async function fetchReceiptById(client, receiptId) {
    const { rows } = await client.query(
        `
      SELECT *
      FROM ${PAYMENT_RECEIPT_TABLE}
      WHERE ${safeIdent(PAYMENT_RECEIPT_COLS.id)} = $1
      LIMIT 1
    `,
        [receiptId]
    );
    return rows[0] || null;
}

async function openSlotAndUpdateOrder(client, { orderCode, baseAmount, kind = "new" }) {
    await client.query("BEGIN");
    try {
        const slot = await openPaymentSlot(client, {
            orderCode,
            receiverAccount: RECEIVER_ACCOUNT,
            baseAmount,
            slotKind: kind,
            supersedeReason: "integration_test_supersede",
        });

        await client.query(
            `
        UPDATE ${ORDER_TABLE}
        SET ${safeIdent(ORDER_COLS.price)} = $2::numeric,
            ${safeIdent(ORDER_COLS.grossSellingPrice)} = $2::numeric
        WHERE LOWER(${safeIdent(ORDER_COLS.idOrder)}::text) = LOWER($1)
      `,
            [orderCode, Number(slot.expected_amount)]
        );

        await client.query("COMMIT");
        return slot;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
}

async function processWebhook(payload) {
    const parsed = parseWebhookTransaction(payload);
    assert.ok(parsed, "parseWebhookTransaction phải parse được payload test");
    await processWebhookTransactionAsync(payload, parsed);
    return parsed;
}

async function cleanupTestRows(client) {
    const receiptColumns = await getColumns(client, PAYMENT_RECEIPT_TABLE);
    const receiptColumnNames = new Set(receiptColumns.map((col) => col.column_name));
    const receiptOrderCodeColumn =
        PAYMENT_RECEIPT_COLS.idOrder ||
        PAYMENT_RECEIPT_COLS.orderCode ||
        PAYMENT_RECEIPT_COLS.id_order ||
        "id_order";

    await client
        .query(
            `
        DELETE FROM receipt.payment_receipt_financial_audit
        WHERE payment_receipt_id IN (
          SELECT ${safeIdent(PAYMENT_RECEIPT_COLS.id)}
          FROM ${PAYMENT_RECEIPT_TABLE}
          WHERE COALESCE(${safeIdent(receiptOrderCodeColumn)}::text, '') LIKE $1
             OR COALESCE(${safeIdent(PAYMENT_RECEIPT_COLS.note)}::text, '') LIKE $2
        )
      `,
            [`${TEST_PREFIX}%`, `%${TEST_PREFIX}%`]
        )
        .catch(() => null);

    await client
        .query(
            `
        DELETE FROM receipt.payment_receipt_financial_state
        WHERE payment_receipt_id IN (
          SELECT ${safeIdent(PAYMENT_RECEIPT_COLS.id)}
          FROM ${PAYMENT_RECEIPT_TABLE}
          WHERE COALESCE(${safeIdent(receiptOrderCodeColumn)}::text, '') LIKE $1
             OR COALESCE(${safeIdent(PAYMENT_RECEIPT_COLS.note)}::text, '') LIKE $2
        )
      `,
            [`${TEST_PREFIX}%`, `%${TEST_PREFIX}%`]
        )
        .catch(() => null);

    const receiptCleanupPredicates = [
        `COALESCE(${safeIdent(receiptOrderCodeColumn)}::text, '') LIKE $1`,
        `COALESCE(${safeIdent(PAYMENT_RECEIPT_COLS.note)}::text, '') LIKE $2`,
    ];
    if (receiptColumnNames.has(PAYMENT_RECEIPT_COLS.sepayTransactionId)) {
        receiptCleanupPredicates.push(
            `COALESCE(${safeIdent(PAYMENT_RECEIPT_COLS.sepayTransactionId)}::text, '') LIKE $3`
        );
    }

    await client.query(
        `
        DELETE FROM ${PAYMENT_RECEIPT_TABLE}
        WHERE ${receiptCleanupPredicates.join(" OR ")}
      `,
        [`${TEST_PREFIX}%`, `%${TEST_PREFIX}%`, `${TEST_PREFIX}%`]
    );

    await client.query(
        `
        DELETE FROM ${SLOTS_TABLE}
        WHERE COALESCE(id_order::text, '') LIKE $1
      `,
        [`${TEST_PREFIX}%`]
    );

    await client.query(
        `
        DELETE FROM ${ORDER_TABLE}
        WHERE COALESCE(${safeIdent(ORDER_COLS.idOrder)}::text, '') LIKE $1
      `,
        [`${TEST_PREFIX}%`]
    );
}

function installEventCollector() {
    const originalEmit = eventBus.emit.bind(eventBus);
    const events = [];

    eventBus.emit = (eventName, payload) => {
        events.push({
            eventName,
            payload: payload ? JSON.parse(JSON.stringify(payload)) : payload,
        });
        return originalEmit(eventName, payload);
    };

    return {
        events,
        restore() {
            eventBus.emit = originalEmit;
        },
        drain() {
            const copy = events.slice();
            events.length = 0;
            return copy;
        },
    };
}

async function caseSlotPaymentSuccess(client, run, collector) {
    const orderCode = uniqueCode("SUCCESS", run);
    const baseAmount = 120000 + run * 1000;
    await cloneOrderFromTemplate(client, { orderCode, price: baseAmount, status: STATUS.UNPAID, cost: 30000 });

    const slot = await openSlotAndUpdateOrder(client, { orderCode, baseAmount });
    collector.drain();

    const transactionId = `${Date.now()}${run}1`;
    await processWebhook(
        makeSepayPayload({
            transactionId,
            referenceCode: `${TEST_PREFIX}-REF-SUCCESS-${run}`,
            amount: Number(slot.expected_amount),
            content: `${TEST_PREFIX} thanh toan slot ${orderCode}`,
        })
    );

    const order = await fetchOrder(client, orderCode);
    const slots = await fetchSlots(client, orderCode);
    const events = collector.drain();

    assert.equal(order?.[ORDER_COLS.status], STATUS.PAID, "Order phải chuyển sang Đã Thanh Toán");
    assert.equal(slots.length, 1, "Phải có đúng 1 slot");
    assert.equal(slots[0].status, "matched", "Slot phải chuyển matched");
    assert.equal(Number(slots[0].payment_receipt_id) > 0, true, "Slot phải link receipt id");
    assert.ok(
        await fetchReceiptById(client, slots[0].payment_receipt_id),
        "Receipt được slot link phải tồn tại"
    );
    assert.ok(
        events.some(
            (event) =>
                event.eventName === EVENTS.SEPAY_MONEY_IN &&
                event.payload?.transactionId === transactionId &&
                normalizeNumber(event.payload?.amount) === Number(slot.expected_amount) &&
                event.payload?.orderCode === orderCode &&
                event.payload?.isOrderPayment === true
        ),
        "Phải emit SEPAY_MONEY_IN cho thanh toán đơn"
    );

    return { orderCode, expectedAmount: Number(slot.expected_amount), transactionId };
}

async function caseDuplicateWebhookIsIdempotent(client, run, collector) {
    const orderCode = uniqueCode("DUP", run);
    const baseAmount = 130000 + run * 1000;
    await cloneOrderFromTemplate(client, { orderCode, price: baseAmount, status: STATUS.UNPAID, cost: 20000 });

    const slot = await openSlotAndUpdateOrder(client, { orderCode, baseAmount });
    const transactionId = `${Date.now()}${run}2`;
    const payload = makeSepayPayload({
        transactionId,
        referenceCode: `${TEST_PREFIX}-REF-DUP-${run}`,
        amount: Number(slot.expected_amount),
        content: `${TEST_PREFIX} duplicate check ${orderCode}`,
    });

    collector.drain();
    await processWebhook(payload);
    const firstEvents = collector.drain();
    await processWebhook(payload);
    const secondEvents = collector.drain();

    const slots = await fetchSlots(client, orderCode);
    const linkedReceipt = await fetchReceiptById(client, slots[0].payment_receipt_id);

    assert.ok(linkedReceipt, "Duplicate vẫn phải giữ receipt được slot link");
    assert.equal(slots[0].status, "matched", "Slot vẫn matched sau duplicate");
    assert.ok(
        firstEvents.some((event) => event.eventName === EVENTS.SEPAY_MONEY_IN),
        "Lần đầu phải emit SEPAY_MONEY_IN"
    );
    assert.equal(
        secondEvents.some((event) => event.eventName === EVENTS.SEPAY_MONEY_IN),
        false,
        "Duplicate không được emit SEPAY_MONEY_IN lần nữa"
    );

    return { orderCode, expectedAmount: Number(slot.expected_amount), transactionId };
}

async function caseWrongAmountDoesNotMatchSlot(client, run, collector) {
    const orderCode = uniqueCode("WRONG-AMT", run);
    const baseAmount = 140000 + run * 1000;
    await cloneOrderFromTemplate(client, { orderCode, price: baseAmount, status: STATUS.UNPAID, cost: 10000 });

    const slot = await openSlotAndUpdateOrder(client, { orderCode, baseAmount });
    const wrongAmount = Number(slot.expected_amount) + 333;
    const transactionId = `${Date.now()}${run}3`;

    collector.drain();
    await processWebhook(
        makeSepayPayload({
            transactionId,
            referenceCode: `${TEST_PREFIX}-REF-WRONG-${run}`,
            amount: wrongAmount,
            content: `${TEST_PREFIX} wrong amount ${orderCode}`,
        })
    );

    const order = await fetchOrder(client, orderCode);
    const slots = await fetchSlots(client, orderCode);
    const receiptsForOrder = await fetchReceiptsForOrder(client, orderCode);
    const receiptByTxn = await fetchReceiptsByTransactionId(client, transactionId);
    const events = collector.drain();

    assert.equal(order?.[ORDER_COLS.status], STATUS.UNPAID, "Sai số tiền không được chuyển order sang paid");
    assert.equal(slots[0].status, "pending", "Sai số tiền không được match slot");
    assert.equal(receiptsForOrder.length, 0, "Sai số tiền không được gắn receipt vào order");
    assert.equal(receiptByTxn.length, 1, "Vẫn ghi nhận receipt ngoài luồng để đối soát");
    assert.ok(
        events.some(
            (event) =>
                event.eventName === EVENTS.SEPAY_MONEY_IN &&
                event.payload?.transactionId === transactionId &&
                event.payload?.orderCode === null &&
                event.payload?.isOrderPayment === false
        ),
        "Sai số tiền phải emit money-in ngoài luồng, không phải order payment"
    );

    return { orderCode, expectedAmount: Number(slot.expected_amount), wrongAmount, transactionId };
}

async function caseSupersededSlot(client, run, collector) {
    const orderCode = uniqueCode("SUPERSEDE", run);
    const firstBase = 150000 + run * 1000;
    const secondBase = 160000 + run * 1000;
    await cloneOrderFromTemplate(client, { orderCode, price: firstBase, status: STATUS.UNPAID, cost: 10000 });

    const firstSlot = await openSlotAndUpdateOrder(client, { orderCode, baseAmount: firstBase });
    const secondSlot = await openSlotAndUpdateOrder(client, { orderCode, baseAmount: secondBase });

    collector.drain();
    await processWebhook(
        makeSepayPayload({
            transactionId: `${Date.now()}${run}4`,
            referenceCode: `${TEST_PREFIX}-REF-OLD-SLOT-${run}`,
            amount: Number(firstSlot.expected_amount),
            content: `${TEST_PREFIX} old superseded slot ${orderCode}`,
        })
    );

    let order = await fetchOrder(client, orderCode);
    let slots = await fetchSlots(client, orderCode);
    assert.equal(order?.[ORDER_COLS.status], STATUS.UNPAID, "Thanh toán slot cũ không được chuyển paid");
    assert.equal(slots.find((slot) => Number(slot.id) === Number(firstSlot.id))?.status, "cancelled");
    assert.equal(slots.find((slot) => Number(slot.id) === Number(secondSlot.id))?.status, "pending");

    collector.drain();
    const newTransactionId = `${Date.now()}${run}5`;
    await processWebhook(
        makeSepayPayload({
            transactionId: newTransactionId,
            referenceCode: `${TEST_PREFIX}-REF-NEW-SLOT-${run}`,
            amount: Number(secondSlot.expected_amount),
            content: `${TEST_PREFIX} latest slot ${orderCode}`,
        })
    );

    order = await fetchOrder(client, orderCode);
    slots = await fetchSlots(client, orderCode);
    const events = collector.drain();

    assert.equal(order?.[ORDER_COLS.status], STATUS.PAID, "Thanh toán slot mới phải chuyển paid");
    assert.equal(slots.find((slot) => Number(slot.id) === Number(secondSlot.id))?.status, "matched");
    assert.ok(
        events.some(
            (event) =>
                event.eventName === EVENTS.SEPAY_MONEY_IN &&
                event.payload?.transactionId === newTransactionId &&
                event.payload?.orderCode === orderCode &&
                event.payload?.isOrderPayment === true
        ),
        "Thanh toán slot mới phải emit SEPAY_MONEY_IN order payment"
    );

    return {
        orderCode,
        oldExpectedAmount: Number(firstSlot.expected_amount),
        newExpectedAmount: Number(secondSlot.expected_amount),
    };
}

async function caseOrderDeletedEvent(client, run, collector) {
    void client;
    const orderCode = uniqueCode("DELETE-EVENT", run);
    collector.drain();

    eventBus.emit(EVENTS.ORDER_DELETED, {
        orderCode,
        totalAmount: 240000,
        daysRemaining: 15,
        totalDays: 30,
        monthKey: todayYmd().slice(0, 7),
        source: "integration_test",
    });

    const events = collector.drain();
    assert.ok(
        events.some(
            (event) =>
                event.eventName === EVENTS.ORDER_DELETED &&
                event.payload?.orderCode === orderCode &&
                normalizeNumber(event.payload?.totalAmount) === 240000 &&
                normalizeNumber(event.payload?.daysRemaining) === 15 &&
                normalizeNumber(event.payload?.totalDays) === 30
        ),
        "Phải emit ORDER_DELETED payload đúng cho notification/dashboard subscriber"
    );

    return { orderCode };
}

const CASES = [
    ["slot payment success", caseSlotPaymentSuccess],
    ["duplicate webhook idempotency", caseDuplicateWebhookIsIdempotent],
    ["wrong amount does not match slot", caseWrongAmountDoesNotMatchSlot],
    ["superseded slot flow", caseSupersededSlot],
    ["order deleted notification event", caseOrderDeletedEvent],
];

async function main() {
    const client = await pool.connect();
    const collector = installEventCollector();
    const results = [];

    try {
        console.log("[setup] DB order table:", `${orderTableParts.schema}.${orderTableParts.table}`);
        console.log("[setup] DB receipt table:", `${receiptTableParts.schema}.${receiptTableParts.table}`);
        console.log("[setup] receiver account:", RECEIVER_ACCOUNT);
        console.log("[setup] runs per case:", RUNS_PER_CASE);

        await cleanupTestRows(client);

        for (const [caseName, fn] of CASES) {
            for (let run = 1; run <= RUNS_PER_CASE; run += 1) {
                const label = `${caseName} #${run}`;
                const startedAt = Date.now();
                try {
                    const detail = await fn(client, run, collector);
                    const elapsedMs = Date.now() - startedAt;
                    results.push({ caseName, run, ok: true, elapsedMs, detail });
                    console.log(`✅ ${label} (${elapsedMs}ms)`, detail);
                } catch (error) {
                    const elapsedMs = Date.now() - startedAt;
                    results.push({
                        caseName,
                        run,
                        ok: false,
                        elapsedMs,
                        error: error.message,
                        stack: error.stack,
                    });
                    console.error(`❌ ${label} (${elapsedMs}ms)`);
                    console.error(error.stack || error.message);
                    throw error;
                }
            }
        }

        const passed = results.filter((item) => item.ok).length;
        const failed = results.length - passed;
        console.log("\n=== SePay Order/Notification Flow Integration Summary ===");
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Total:  ${results.length}`);

        assert.equal(failed, 0, "Tất cả case phải pass");
    } finally {
        collector.restore();
        await cleanupTestRows(client).catch((error) => {
            console.warn("[cleanup] Không cleanup được toàn bộ test rows:", error.message);
        });
        client.release();
        await pool.end();
    }
}

main().catch((error) => {
    console.error("\n[FAILED] SePay order/notification flow integration suite failed.");
    console.error(error.stack || error.message);
    process.exitCode = 1;
});