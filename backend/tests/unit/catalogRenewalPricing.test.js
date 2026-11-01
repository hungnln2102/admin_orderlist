require("module-alias/register");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  getOrderPrefix,
  resolveOrderCatalogPricing,
  syncRenewRequiredOrdersPricing,
} = require("@/domains/products/services/catalogPricingService");
const { buildDueOrderMessage } = require("@/domains/notifications/telegram/builders/orderMessageBuilder");
const { ORDER_STATUS } = require("@/constants/orderStatus");

describe("Catalog Renewal Pricing & Inactive Notification Suite", () => {
  describe("1. getOrderPrefix logic", () => {
    it("phân tích chính xác prefix từ id_order", () => {
      assert.strictEqual(getOrderPrefix("MAVL12345"), "MAVL");
      assert.strictEqual(getOrderPrefix("MAVC99999"), "MAVC");
      assert.strictEqual(getOrderPrefix("MAVK00001"), "MAVK");
      assert.strictEqual(getOrderPrefix("MAVS88888"), "MAVS");
      assert.strictEqual(getOrderPrefix("MAVT55555"), "MAVT");
      assert.strictEqual(getOrderPrefix("MAVN11111"), "MAVN");
      assert.strictEqual(getOrderPrefix("UNKNOWN"), "MAVL");
    });
  });

  describe("2. resolveOrderCatalogPricing", () => {
    it("lấy đúng giá theo tier_id và cờ isActive từ catalog", async () => {
      const mockDb = (table) => {
        const builder = {
          where: (criteria) => builder,
          whereILike: () => builder,
          orWhereILike: () => builder,
          first: async () => {
            if (String(table).includes("variant")) {
              return {
                id: 10,
                display_name: "Youtube Premium 1 Năm",
                base_price: 300000,
                is_active: true,
              };
            }
            return null;
          },
          then: (resolve) => {
            if (String(table).includes("variant_price")) {
              // ctv = 180k, retail = 200k, promo = 190k, student = 170k
              resolve([
                { variant_id: 10, tier_id: 1, price: 180000 },
                { variant_id: 10, tier_id: 2, price: 200000 },
                { variant_id: 10, tier_id: 3, price: 190000 },
                { variant_id: 10, tier_id: 4, price: 170000 },
              ]);
              return;
            }
            resolve([]);
          },
        };
        return builder;
      };

      // MAVL -> retail (200,000 ₫)
      const resMavl = await resolveOrderCatalogPricing(mockDb, { id_order: "MAVL01", id_product: 10 });
      assert.strictEqual(resMavl.catalogBasePrice, 200000);
      assert.strictEqual(resMavl.isActive, true);

      // MAVC -> ctv (180,000 ₫)
      const resMavc = await resolveOrderCatalogPricing(mockDb, { id_order: "MAVC01", id_product: 10 });
      assert.strictEqual(resMavc.catalogBasePrice, 180000);

      // MAVK -> promo (190,000 ₫)
      const resMavk = await resolveOrderCatalogPricing(mockDb, { id_order: "MAVK01", id_product: 10 });
      assert.strictEqual(resMavk.catalogBasePrice, 190000);

      // MAVS -> student (170,000 ₫)
      const resMavs = await resolveOrderCatalogPricing(mockDb, { id_order: "MAVS01", id_product: 10 });
      assert.strictEqual(resMavs.catalogBasePrice, 170000);

      // MAVT -> Quà tặng = 0đ
      const resMavt = await resolveOrderCatalogPricing(mockDb, { id_order: "MAVT01", id_product: 10 });
      assert.strictEqual(resMavt.catalogBasePrice, 0);
    });

    it("nhận diện chính xác isActive = false khi variant bị ngưng hoạt động", async () => {
      const mockDbInactive = (table) => {
        const builder = {
          where: () => builder,
          whereILike: () => builder,
          orWhereILike: () => builder,
          first: async () => ({
            id: 20,
            display_name: "Gói Ngưng Bán",
            base_price: 150000,
            is_active: false,
          }),
          then: (resolve) => resolve([]),
        };
        return builder;
      };

      const res = await resolveOrderCatalogPricing(mockDbInactive, { id_order: "MAVL99", id_product: 20 });
      assert.strictEqual(res.isActive, false);
      assert.strictEqual(res.catalogBasePrice, 150000);
    });
  });

  describe("3. syncRenewRequiredOrdersPricing - Bảo Vệ Tuyệt Đối Đơn PAID & EXPIRED", () => {
    it("chỉ đồng bộ giá cho đơn RENEW_REQUIRED, không chạm vào PAID hoặc EXPIRED", async () => {
      const updatedOrders = [];
      const ordersInDb = [
        // Đơn RENEW_REQUIRED: Giá cũ 200k, slot suffix 4 -> cần cập nhật sang 150k + 4 = 150.004
        { id: 1, id_order: "MAVL01", id_product: 10, price: 200004, gross_selling_price: 200000, status: ORDER_STATUS.RENEW_REQUIRED },
        // Đơn PAID: Giá lịch sử 200k -> BẮT BUỘC KHÔNG THAY ĐỔI
        { id: 2, id_order: "MAVL02", id_product: 10, price: 200004, gross_selling_price: 200000, status: ORDER_STATUS.PAID },
        // Đơn EXPIRED: Giá lịch sử 200k -> BẮT BUỘC KHÔNG THAY ĐỔI
        { id: 3, id_order: "MAVL03", id_product: 10, price: 200004, gross_selling_price: 200000, status: ORDER_STATUS.EXPIRED },
      ];

      const mockDb = (table) => {
        const builder = {
          _statusFilter: [],
          whereIn: (col, val) => {
            builder._statusFilter = val;
            return builder;
          },
          andWhere: (fn) => builder,
          select: async () => {
            return ordersInDb.filter((o) => builder._statusFilter.includes(o.status));
          },
          where: (crit) => ({
            first: async () => ({ id: 10, display_name: "Catalog Prod", base_price: 150000, is_active: true }),
            update: async (fields) => {
              updatedOrders.push({ id: crit.id, fields });
              return 1;
            },
            then: (resolve) => resolve([]),
          }),
          then: (resolve) => resolve([]),
        };
        return builder;
      };

      const result = await syncRenewRequiredOrdersPricing(mockDb, 10);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.updatedCount, 1);

      // Chỉ có đơn id 1 (RENEW_REQUIRED) bị cập nhật
      assert.strictEqual(updatedOrders.length, 1);
      assert.strictEqual(updatedOrders[0].id, 1);
      assert.strictEqual(updatedOrders[0].fields.gross_selling_price, 150000);
      assert.strictEqual(updatedOrders[0].fields.price, 150004); // giữ nguyên slot 4
    });
  });

  describe("4. buildDueOrderMessage - Lược Bỏ Giá & QR Cho Sản Phẩm Không Hoạt Động", () => {
    const mockBank = {
      bankCode: "MB",
      accountNumber: "0999999999",
      accountHolder: "SHOP DEMO",
    };

    it("khi is_active = true: Hiển thị đầy đủ giá bán và thông tin thanh toán", () => {
      const orderActive = {
        id_order: "MAVL123",
        productName: "Gói Active",
        daysLeft: 4,
        price: 80004,
        customer: "Huy Trần",
        is_active: true,
      };

      const msg = buildDueOrderMessage(orderActive, 1, 1, mockBank);
      assert.ok(msg.includes("💰 Giá bán:"), "Phải có dòng Giá bán");
      assert.ok(msg.includes("——— ℹ️ THÔNG TIN THANH TOÁN ———"), "Phải có phần Thông tin thanh toán");
      assert.ok(msg.includes("0999999999"), "Phải có STK ngân hàng");
    });

    it("khi is_active = false: LƯỢC BỎ GIÁ BÁN, LƯỢC BỎ STK VÀ HIỆN CẢNH BÁO", () => {
      const orderInactive = {
        id_order: "MAVL123",
        productName: "Gói Inactive",
        daysLeft: 4,
        price: 80004,
        customer: "Huy Trần",
        is_active: false,
      };

      const msg = buildDueOrderMessage(orderInactive, 1, 1, mockBank);
      assert.strictEqual(msg.includes("💰 Giá bán:"), false, "Không được hiển thị dòng Giá bán");
      assert.strictEqual(msg.includes("——— ℹ️ THÔNG TIN THANH TOÁN ———"), false, "Không được hiển thị Thông tin thanh toán");
      assert.strictEqual(msg.includes("0999999999"), false, "Không được hiển thị STK");
      assert.ok(msg.includes("⚠️ Sản phẩm hiện đang tạm ngưng hoạt động"), "Phải có cảnh báo ngưng hoạt động");
    });
  });
});
