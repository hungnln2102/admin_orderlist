require("module-alias/register");
const test = require("node:test");
const assert = require("node:assert/strict");

const dbIndexPath = require.resolve("../../src/db");
const originalDbModule = require.cache[dbIndexPath];
const { TABLES, SCHEMAS, COLS } = require("../../src/db/tables");

let mockRawHandler = async () => ({ rows: [] });

require.cache[dbIndexPath] = {
  id: dbIndexPath,
  filename: dbIndexPath,
  loaded: true,
  exports: {
    db: { raw: (...args) => mockRawHandler(...args) },
    TABLES,
    SCHEMAS,
    COLS,
  },
};

const {
  parseVariantDurationAndGroup,
  getPublicPriceList,
} = require("../../src/domains/products/services/publicPricingService");

test.after(() => {
  if (originalDbModule) require.cache[dbIndexPath] = originalDbModule;
  else delete require.cache[dbIndexPath];
});

test("parseVariantDurationAndGroup phân giải chính xác --xm/--xd/--xy và đoạn đầu biến thể", () => {
  assert.deepEqual(parseVariantDurationAndGroup("Adobe_Renew2--1m", "Adobe Acc Cấp"), {
    duration: "1 tháng",
    durationMonths: 1,
    variantGroup: "adobe_renew2",
  });
  assert.deepEqual(parseVariantDurationAndGroup("Adobe_Renew2--3m", "Adobe Acc Cấp"), {
    duration: "3 tháng",
    durationMonths: 3,
    variantGroup: "adobe_renew2",
  });
  assert.deepEqual(parseVariantDurationAndGroup("Canva_Add--12m", "Canva Slot Team"), {
    duration: "12 tháng",
    durationMonths: 12,
    variantGroup: "canva_add",
  });
  assert.deepEqual(parseVariantDurationAndGroup("Plan--1y", "Gói Năm"), {
    duration: "12 tháng",
    durationMonths: 12,
    variantGroup: "plan",
  });
  assert.deepEqual(parseVariantDurationAndGroup("Trial--7d", "Dùng thử"), {
    duration: "7 ngày",
    durationMonths: 0.2333,
    variantGroup: "trial",
  });
  assert.deepEqual(parseVariantDurationAndGroup("NoDuration", "Gói Riêng"), {
    duration: "",
    durationMonths: null,
    variantGroup: "noduration",
  });
});

test("getPublicPriceList gom liền kề Product + Variant, tách price/promo_price và không lộ dữ liệu nội bộ", async () => {
  mockRawHandler = async () => ({
    rows: [
      {
        id: "258",
        product_id: "1",
        product_name: "Adobe",
        category: "Thiết kế & Đồ họa",
        image_url: "https://admin.mavrykpremium.com/image_product/adobe.jpg",
        variant_name: "Adobe Acc Cấp",
        display_name: "Adobe_Renew2--3m",
        description: null,
        retail_price: "450000.00",
        promo_price: "0.00",
      },
      {
        id: "260",
        product_id: "1",
        product_name: "Adobe",
        category: "Thiết kế & Đồ họa",
        image_url: "https://admin.mavrykpremium.com/image_product/adobe.jpg",
        variant_name: "Adobe Add Team",
        display_name: "Adobe_Add--1m",
        description: "Nâng cấp chính chủ",
        retail_price: "350000.00",
        promo_price: "290000.00",
      },
      {
        id: "259",
        product_id: "1",
        product_name: "Adobe",
        category: "Thiết kế & Đồ họa",
        image_url: "https://admin.mavrykpremium.com/image_product/adobe.jpg",
        variant_name: "Adobe Acc Cấp",
        display_name: "Adobe_Renew2--1m",
        description: null,
        retail_price: "150000.00",
        promo_price: "0.00",
      },
    ],
  });

  const result = await getPublicPriceList();
  assert.equal(result.total, 3);

  // Adobe_Add đứng trước Adobe_Renew2; trong Adobe_Renew2 thì 1m đứng trước 3m
  assert.deepEqual(
    result.items.map((it) => ({
      id: it.id,
      group: it.variant_group,
      duration: it.duration,
      price: it.price,
      promo_price: it.promo_price,
      desc: it.desc,
    })),
    [
      {
        id: 260,
        group: "adobe_add",
        duration: "1 tháng",
        price: 350000,
        promo_price: 290000,
        desc: "Nâng cấp chính chủ",
      },
      {
        id: 259,
        group: "adobe_renew2",
        duration: "1 tháng",
        price: 150000,
        promo_price: null,
        desc: "",
      },
      {
        id: 258,
        group: "adobe_renew2",
        duration: "3 tháng",
        price: 450000,
        promo_price: null,
        desc: "",
      },
    ]
  );

  const forbidden = [
    "base_price",
    "cost_price",
    "supplier_min_cost",
    "ctv_price",
    "student_price",
    "margin_ratio",
  ];
  for (const item of result.items) {
    for (const key of forbidden) {
      assert.equal(key in item, false, `Không được lộ trường nội bộ: ${key}`);
    }
  }
});
