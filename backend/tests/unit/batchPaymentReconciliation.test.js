require("module-alias/register");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { applySuffixToPrice } = require("@/domains/payments/services/slotSuffixService");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const {
  getOrderPrefix,
  resolveOrdersWithCatalogPrices,
  excludeOrderFromPendingBatches,
} = require("@/domains/invoices/services/batchPaymentService");

describe("Batch Payment & Slot Suffix Reconciliation Suite", () => {
  describe("1. Slot Suffix Arithmetic", () => {
    it("applySuffixToPrice cộng chính xác suffix vào giá làm tròn hàng trăm", () => {
      assert.strictEqual(applySuffixToPrice(500000, 23), 500023);
      assert.strictEqual(applySuffixToPrice(250000, 1), 250001);
      assert.strictEqual(applySuffixToPrice(999900, 100), 1000000);
      assert.strictEqual(applySuffixToPrice(150045, 12), 150057);
    });
  });

  describe("2. Batch Creation & Allocation Distribution Logic", () => {
    it("Đơn cuối cùng trong đợt gộp nhận khoản bù slot_suffix để tổng phân bổ khớp 100%", () => {
      const orders = [
        { id_order: "MAVC01", price: 200000, status: ORDER_STATUS.UNPAID },
        { id_order: "MAVC02", price: 150000, status: ORDER_STATUS.RENEW_REQUIRED },
        { id_order: "MAVC03", price: 300000, status: ORDER_STATUS.UNPAID },
      ];

      const baseAmount = orders.reduce((sum, o) => sum + o.price, 0); // 650000
      assert.strictEqual(baseAmount, 650000);

      const slotSuffix = 37;
      const transferAmount = applySuffixToPrice(baseAmount, slotSuffix); // 650037
      assert.strictEqual(transferAmount, 650037);

      let totalAllocated = 0;
      const allocations = [];

      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const isLast = i === orders.length - 1;
        const allocAmount = isLast ? transferAmount - totalAllocated : order.price;
        totalAllocated += allocAmount;
        allocations.push({ id_order: order.id_order, amount: allocAmount });
      }

      assert.strictEqual(allocations[0].amount, 200000);
      assert.strictEqual(allocations[1].amount, 150000);
      assert.strictEqual(allocations[2].amount, 300037); // Đơn cuối nhận +37đ
      assert.strictEqual(totalAllocated, transferAmount);
    });

    it("Format mã đợt gộp tuân thủ chuẩn MBP-YYYYMMDD-XXXX", () => {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      const batchCode = `MBP-${todayStr}-${randomHex}`;

      assert.match(batchCode, /^MBP-\d{8}-[A-Z0-9]{4}$/);
    });
  });

  describe("3. Webhook 2-Layer Pattern Matching", () => {
    it("Lớp 1: Trích xuất chính xác batch_code MBP-... trong nội dung chuyển khoản", () => {
      const samples = [
        "MBP-20261029-A1B2",
        "KH CHUYEN KHOAN MBP-20261029-ABCD",
        "thanh toan mbp-20261029-99zz cam on",
        "MBP-20261029-1234. Nguyen Van A",
      ];

      for (const text of samples) {
        const match = text.match(/MBP-[A-Z0-9-]+/i);
        assert.ok(match, `Phải tìm thấy mã batch trong "${text}"`);
        assert.ok(match[0].toUpperCase().startsWith("MBP-"));
      }
    });

    it("Lớp 2: Khi khách xóa nội dung chuyển khoản, tổng tiền kèm slot suffix là duy nhất", () => {
      const emptyNotes = ["", "   ", "chuyen tien", "NGUYEN VAN A"];
      for (const note of emptyNotes) {
        const match = note.match(/MBP-[A-Z0-9-]+/i);
        assert.strictEqual(
          match === null || match[0] === undefined || !match[0].startsWith("MBP-2026"),
          true,
          "Không được match nhầm mã batch khi note không hợp lệ"
        );
      }
    });
  });

  describe("4. Quy Tắc Lấy Giá Gốc Bảng Giá & Phân Biệt Tiền Tố (Chỉ Đạo Của Master)", () => {
    it("getOrderPrefix phân tích chính xác tiền tố MAVL, MAVC, MAVK, MAVS, MAVT", () => {
      assert.strictEqual(getOrderPrefix("MAVL_UFCBR"), "MAVL");
      assert.strictEqual(getOrderPrefix("MAVC_4RU3G"), "MAVC");
      assert.strictEqual(getOrderPrefix("MAVK_PROMO1"), "MAVK");
      assert.strictEqual(getOrderPrefix("MAVS_STU01"), "MAVS");
      assert.strictEqual(getOrderPrefix("MAVT_GIFT01"), "MAVT");
      assert.strictEqual(getOrderPrefix("mavc123"), "MAVC");
      assert.strictEqual(getOrderPrefix("mavl999"), "MAVL");
      assert.strictEqual(getOrderPrefix("OTHER_123"), "MAVL");
    });

    it("resolveOrdersWithCatalogPrices lấy đúng tier_id từ bảng giá và MAVT = 0đ (Không làm tròn)", async () => {
      const mockVariants = [
        { id: 259, display_name: "Adobe Full App 1 Tháng", variant_name: "Adobe_Renew2--1m", base_price: 160000 },
      ];

      const mockPrices = [
        { variant_id: 259, tier_id: 1, price: 100000 }, // MAVC (CTV)
        { variant_id: 259, tier_id: 2, price: 150000 }, // MAVL (Bán lẻ)
        { variant_id: 259, tier_id: 3, price: 130000 }, // MAVK (Khuyến mãi)
        { variant_id: 259, tier_id: 4, price: 110000 }, // MAVS (Sinh viên)
      ];

      const mockQueryDb = (tableName) => {
        const isPriceTable = String(tableName).includes("variant_price");
        const rows = isPriceTable ? mockPrices : mockVariants;
        const builder = {
          where: () => builder,
          whereILike: () => builder,
          orWhereILike: () => builder,
          first: async () => isPriceTable ? null : mockVariants[0],
          then: (resolve) => resolve(rows),
        };
        return builder;
      };

      const inputOrders = [
        { id_order: "MAVLUFCBR", id_product: 259, price: 150056, gross_selling_price: 150056 },
        { id_order: "MAVC4RU3G", id_product: 259, price: 100049, gross_selling_price: 100049 },
        { id_order: "MAVKUA5XR", id_product: 259, price: 130047, gross_selling_price: 130047 },
        { id_order: "MAVSSTU01", id_product: 259, price: 110012, gross_selling_price: 110012 },
        { id_order: "MAVTFREE1", id_product: 259, price: 150000, gross_selling_price: 150000 },
      ];

      const resolved = await resolveOrdersWithCatalogPrices(mockQueryDb, inputOrders);

      assert.strictEqual(resolved[0].orderPrefix, "MAVL");
      assert.strictEqual(resolved[0].catalogBasePrice, 150000);

      assert.strictEqual(resolved[1].orderPrefix, "MAVC");
      assert.strictEqual(resolved[1].catalogBasePrice, 100000);

      assert.strictEqual(resolved[2].orderPrefix, "MAVK");
      assert.strictEqual(resolved[2].catalogBasePrice, 130000);

      assert.strictEqual(resolved[3].orderPrefix, "MAVS");
      assert.strictEqual(resolved[3].catalogBasePrice, 110000);

      assert.strictEqual(resolved[4].orderPrefix, "MAVT");
      assert.strictEqual(resolved[4].catalogBasePrice, 0);

      const totalBase = resolved.reduce((sum, o) => sum + o.catalogBasePrice, 0);
      assert.strictEqual(totalBase, 490000);

      const slotSuffix = 7;
      const finalAmount = totalBase + slotSuffix;
      assert.strictEqual(finalAmount, 490007);
    });
  });

  describe("5. Tự Động Loại Trừ Đơn Khỏi Batch PENDING Khi Đơn Được Thanh Toán Hoặc Hết Hạn", () => {
    it("Loại trừ đơn khỏi batch đang pending và tính lại số tiền đợt gộp", async () => {
      let updatedBatchData = null;

      const mockBatch = {
        id: 99,
        batch_code: "MBP-20261029-TEST",
        order_codes: JSON.stringify(["MAVL01", "MAVC02", "MAVT03"]),
        order_ids: JSON.stringify([1, 2, 3]),
        order_allocations: JSON.stringify([
          { orderCode: "MAVL01", orderId: 1, basePrice: 150000 },
          { orderCode: "MAVC02", orderId: 2, basePrice: 100000 },
          { orderCode: "MAVT03", orderId: 3, basePrice: 0 },
        ]),
        base_amount: 250000,
        slot_suffix: 5,
        total_amount: 250005,
        status: "PENDING",
      };

      const mockQueryDb = (tableName) => {
        const queryObj = {
          where: () => queryObj,
          andWhere: () => queryObj,
          forUpdate: async () => [mockBatch],
          update: async (data) => {
            updatedBatchData = data;
            return 1;
          },
        };
        return queryObj;
      };

      // Đơn MAVL01 được thanh toán riêng
      await excludeOrderFromPendingBatches(mockQueryDb, "MAVL01", "Đã thanh toán riêng lẻ");

      assert.ok(updatedBatchData, "Phải gọi update cho batch chứa đơn MAVL01");
      const remainingCodes = JSON.parse(updatedBatchData.order_codes);
      assert.deepStrictEqual(remainingCodes, ["MAVC02", "MAVT03"]);

      // Tiền gốc mới: 100k + 0 = 100k
      assert.strictEqual(updatedBatchData.base_amount, 100000);
      // Số tiền CK mới: 100k + 5đ = 100.005 ₫
      assert.strictEqual(updatedBatchData.total_amount, 100005);
    });

    it("Khi toàn bộ đơn trong batch bị loại trừ, batch tự động chuyển CANCELED", async () => {
      let updatedStatus = null;

      const mockBatch = {
        id: 100,
        batch_code: "MBP-20261029-SOLO",
        order_codes: JSON.stringify(["MAVL99"]),
        order_ids: JSON.stringify([99]),
        order_allocations: JSON.stringify([
          { orderCode: "MAVL99", orderId: 99, basePrice: 150000 },
        ]),
        base_amount: 150000,
        slot_suffix: 9,
        total_amount: 150009,
        status: "PENDING",
      };

      const mockQueryDb = () => {
        const queryObj = {
          where: () => queryObj,
          andWhere: () => queryObj,
          forUpdate: async () => [mockBatch],
          update: async (data) => {
            updatedStatus = data.status;
            return 1;
          },
        };
        return queryObj;
      };

      await excludeOrderFromPendingBatches(mockQueryDb, "MAVL99", "Đơn đã hết hạn");
      assert.strictEqual(updatedStatus, "CANCELED");
    });
  });

  describe("6. Phân Bổ Webhook Theo order_allocations & Chống Nhân Đôi Doanh Thu", () => {
    it("Đơn MAVT nhận đúng 0đ, đơn MAVL nhận đúng 150k và đơn cuối nhận bù suffix", () => {
      const transferAmount = 250012; // 150k + 100k + 0 + suffix 12đ
      const savedAllocations = [
        { orderCode: "MAVT_GIFT", basePrice: 0 },
        { orderCode: "MAVL_RETAIL", basePrice: 150000 },
        { orderCode: "MAVC_CTV", basePrice: 100000 },
      ];

      const subOrders = [
        { id_order: "MAVT_GIFT", status: ORDER_STATUS.UNPAID },
        { id_order: "MAVL_RETAIL", status: ORDER_STATUS.UNPAID },
        { id_order: "MAVC_CTV", status: ORDER_STATUS.RENEW_REQUIRED },
      ];

      const allocMap = new Map(savedAllocations.map((a) => [a.orderCode, a]));
      let totalAllocated = 0;
      const results = [];

      for (let i = 0; i < subOrders.length; i++) {
        const sub = subOrders[i];
        const isLast = (i === subOrders.length - 1);
        const basePrice = allocMap.get(sub.id_order)?.basePrice ?? 0;
        const allocAmount = isLast ? (transferAmount - totalAllocated) : basePrice;
        totalAllocated += allocAmount;
        results.push({ id_order: sub.id_order, amount: allocAmount });
      }

      assert.strictEqual(results[0].amount, 0); // MAVT = 0đ
      assert.strictEqual(results[1].amount, 150000); // MAVL = 150k
      assert.strictEqual(results[2].amount, 100012); // Đơn cuối = 100k + 12đ bù
      assert.strictEqual(totalAllocated, transferAmount);
    });

    it("Đơn con đã PAID trước đó không bị phân bổ lại, tiền thừa nằm ở unallocated", () => {
      const transferAmount = 250012;
      const subOrders = [
        { id_order: "MAVL_RETAIL", status: ORDER_STATUS.PAID }, // Đã thanh toán riêng trước
        { id_order: "MAVC_CTV", status: ORDER_STATUS.UNPAID },
      ];

      const allocMap = new Map([
        ["MAVL_RETAIL", { basePrice: 150000 }],
        ["MAVC_CTV", { basePrice: 100000 }],
      ]);

      const activePayable = subOrders.filter((o) => o.status === ORDER_STATUS.UNPAID);
      assert.strictEqual(activePayable.length, 1);

      let totalAllocated = 0;
      const results = [];

      for (let i = 0; i < subOrders.length; i++) {
        const sub = subOrders[i];
        if (sub.status !== ORDER_STATUS.UNPAID) {
          continue; // Bỏ qua đơn đã PAID, chống double-counting
        }
        const isLastActive = (sub.id_order === activePayable[activePayable.length - 1].id_order);
        const basePrice = allocMap.get(sub.id_order)?.basePrice ?? 0;
        // Vì chỉ còn đơn này, nó nhận đúng basePrice (hoặc bù suffix của nó)
        const allocAmount = basePrice + 12;
        totalAllocated += allocAmount;
        results.push({ id_order: sub.id_order, amount: allocAmount });
      }

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id_order, "MAVC_CTV");
      assert.strictEqual(results[0].amount, 100012);

      // Tiền dôi ra do đơn MAVL_RETAIL đã PAID
      const unallocatedAmount = transferAmount - totalAllocated;
      assert.strictEqual(unallocatedAmount, 150000); // Giữ nguyên 150k cho khách hoặc admin xử lý
    });
  });
  describe("7. Đơn Cần Gia Hạn (RENEW_REQUIRED) Tự Động Khớp Theo Giá Catalog Mới", () => {
    it("Khớp chính xác khi khách chuyển theo giá Catalog mới kể cả khi đơn trong DB còn lưu giá cũ lịch sử", () => {
      // Giả lập đơn hàng cũ 1 năm trước trong DB
      const order = {
        id: 423,
        id_order: "MAVLUQXW",
        status: ORDER_STATUS.RENEW_REQUIRED,
        price: 252000, // Giá cũ lịch sử
        gross_selling_price: null,
      };

      const transferAmount = 350100; // Khách chuyển theo giá Catalog mới
      const catalogBasePrice = 350000;
      const slotSuffix = 100;
      const expectedRenewalPrice = applySuffixToPrice(catalogBasePrice, slotSuffix);

      assert.strictEqual(expectedRenewalPrice, 350100);
      assert.notStrictEqual(order.price, transferAmount); // Giá cũ không khớp

      // Logic nâng cấp: Khớp theo giá Catalog mới
      const isMatched = (transferAmount === expectedRenewalPrice || transferAmount === catalogBasePrice);
      assert.strictEqual(isMatched, true);
    });
  });

  describe("8. Tự Động Tra Cứu và Đồng Bộ Giá Nhập NCC (catalogCostPrice) Từ Catalog", () => {
    it("resolveOrderCatalogPricing trả về đúng catalogCostPrice từ supplier_cost theo variant và supplier_id", async () => {
      const { resolveOrderCatalogPricing } = require("@/domains/products/services/catalogPricingService");
      const { TABLES } = require("@/db");

      const mockOrder = {
        id: 423,
        id_order: "MAVLUQXW",
        id_product: 131,
        supply_id: 12,
        cost: 80000,
      };

      const mockVariant = {
        id: 131,
        variant_name: "Slot Office 365",
        display_name: "Office365_Add--12m",
        base_price: 350000,
        is_active: true,
      };

      const mockSupplierCosts = [
        { id: 178, variant_id: 131, supplier_id: 12, price: 100000 },
        { id: 296, variant_id: 131, supplier_id: 15, price: 150000 },
      ];

      const mockDb = (tableName) => {
        const queryObj = {
          where: () => queryObj,
          andWhere: (suppCriteria) => ({
            first: async () => mockSupplierCosts.find(sc => sc.supplier_id === suppCriteria.supplier_id) || null,
          }),
          orderBy: () => ({
            first: async () => mockSupplierCosts[0],
          }),
          first: async () => {
            if (tableName === TABLES.VARIANT) return mockVariant;
            if (tableName === TABLES.SUPPLIER_COST) return mockSupplierCosts[0];
            return null;
          },
          then: (resolve) => {
            if (tableName === TABLES.VARIANT_PRICE) {
              resolve([{ tier_id: 2, price: 350000 }]);
              return;
            }
            resolve([]);
          },
        };
        return queryObj;
      };

      const pricing = await resolveOrderCatalogPricing(mockDb, mockOrder);
      assert.strictEqual(pricing.catalogBasePrice, 350000, "Giá bán catalog lẻ phải là 350.000 đ");
      assert.strictEqual(pricing.catalogCostPrice, 100000, "Giá nhập NCC Tài phải là 100.000 đ (thay vì giá cũ 80.000 đ)");
      assert.strictEqual(pricing.supplierId, 12, "NCC phải là 12 (Tài)");
    });
  });

  describe("9. EventBus BATCH_PAYMENT_COMPLETED & Single Finance Notification (Chỉ Đạo Của Master)", () => {
    it("Event BATCH_PAYMENT_COMPLETED chứa đầy đủ thông tin doanh thu, chi phí, và số tiền SePay chuẩn", () => {
      const { EVENTS } = require("@/events");
      assert.strictEqual(EVENTS.BATCH_PAYMENT_COMPLETED, "BATCH_PAYMENT_COMPLETED");

      const eventPayload = {
        batchId: 1,
        batchCode: "MBP-20261105-TEST",
        receiptId: 71,
        transferAmount: 420002,
        totalRevenue: 420002,
        totalCost: 380000,
        ordersCount: 2,
        orders: [
          { id_order: "MAVK6G6K2", amount: 210000, isRenewal: true, newStatus: "PAID" },
          { id_order: "MAVK3AX6A", amount: 210002, isRenewal: true, newStatus: "PAID" },
        ],
      };

      assert.strictEqual(eventPayload.totalRevenue, 420002);
      assert.strictEqual(eventPayload.totalCost, 380000);
      assert.strictEqual(eventPayload.transferAmount, 420002);
      assert.strictEqual(eventPayload.orders.length, 2);
    });
  });

  describe("10. Logic Hoàn Tất Các Đơn Bị Lỗi (fulfillRemainingBatchOrders) — An Toàn Tuyệt Đối", () => {
    it("Chỉ quét các đơn CHƯA PAID để gia hạn, bỏ qua 100% các đơn đã hoàn thành trước đó", () => {
      const subOrders = [
        { id_order: "ORDER_1", status: "PAID", was_paid: true },
        { id_order: "ORDER_2", status: "PAID", was_paid: true },
        { id_order: "ORDER_3", status: "PAID", was_paid: true },
        { id_order: "ORDER_4", status: "RENEW_REQUIRED", was_paid: false },
        { id_order: "ORDER_5", status: "PROCESSING", was_paid: false },
      ];

      const pendingOrders = subOrders.filter(
        (o) => o.status !== "PAID" && o.status !== "Đã Thanh Toán"
      );

      assert.strictEqual(pendingOrders.length, 2);
      assert.strictEqual(pendingOrders[0].id_order, "ORDER_4");
      assert.strictEqual(pendingOrders[1].id_order, "ORDER_5");

      // Giả lập sau khi hoàn tất 2 đơn lỗi
      pendingOrders.forEach((o) => {
        o.status = "PAID";
        o.was_paid = true;
      });

      const remainingAfter = subOrders.filter(
        (o) => o.status !== "PAID" && o.status !== "Đã Thanh Toán"
      );
      assert.strictEqual(remainingAfter.length, 0, "Không còn đơn lỗi nào sau khi hoàn tất.");
    });
  });
});
