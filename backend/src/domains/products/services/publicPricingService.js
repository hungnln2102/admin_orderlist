const { db, TABLES, COLS } = require("@/db");
const { convert: htmlToText } = require("html-to-text");

const P_COLS = COLS.PRODUCT;
const V_COLS = COLS.VARIANT;
const VP_COLS = COLS.VARIANT_PRICE;

const DEFAULT_CATEGORY_ORDER = [
  "AI & Trợ lý",
  "Thiết kế & Đồ họa",
  "Video & Âm thanh",
  "Giải trí & Streaming",
  "Học tập & Văn phòng",
  "Bảo mật & Tiện ích",
  "Khác",
];

const DURATION_SUFFIX_REGEX = /--(\d+)\s*([dmy])$/i;

/**
 * Phân giải hậu tố --xm / --xd / --xy từ display_name thành thời hạn hiển thị,
 * số tháng quy đổi để sắp xếp và khóa gom nhóm đoạn đầu biến thể.
 */
function parseVariantDurationAndGroup(displayName, variantName) {
  const rawDisplay = String(displayName || "").trim();
  const rawVariant = String(variantName || "").trim();
  const match = rawDisplay.match(DURATION_SUFFIX_REGEX);

  let duration = "";
  let durationMonths = null;
  let prefix = rawDisplay;

  if (match) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    prefix = rawDisplay.slice(0, match.index).trim();

    if (Number.isFinite(amount) && amount > 0) {
      if (unit === "m") {
        durationMonths = amount;
        duration = `${amount} tháng`;
      } else if (unit === "y") {
        durationMonths = amount * 12;
        duration = `${amount * 12} tháng`;
      } else if (unit === "d") {
        durationMonths = Number((amount / 30).toFixed(4));
        duration = `${amount} ngày`;
      }
    }
  }

  const variantGroup = (prefix || rawVariant || rawDisplay).toLowerCase();

  return {
    duration,
    durationMonths,
    variantGroup,
  };
}

function resolveCategoryName(rawCategory) {
  const cleaned = String(rawCategory || "").trim();
  return cleaned || "Khác";
}

function slugifyCategory(name) {
  return String(name || "khac")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "khac";
}

function getCategoryOrderIndex(name) {
  const idx = DEFAULT_CATEGORY_ORDER.indexOf(name);
  return idx === -1 ? DEFAULT_CATEGORY_ORDER.length : idx;
}

/**
 * Lấy bảng giá công khai cho khách hàng (mavrykpremium.com/price).
 * Chỉ trả về các trường công khai, tuyệt đối không lộ giá vốn/NCC/CTV/margin.
 */
async function getPublicPriceList() {
  const sql = `
    SELECT
      v.${V_COLS.ID} AS id,
      v.${V_COLS.PRODUCT_ID} AS product_id,
      p.${P_COLS.PACKAGE_NAME} AS product_name,
      p.${P_COLS.CATEGORY} AS category,
      COALESCE(NULLIF(BTRIM(v.${V_COLS.IMAGE_URL}), ''), NULLIF(BTRIM(p.${P_COLS.IMAGE_URL}), '')) AS image_url,
      COALESCE(NULLIF(BTRIM(v.${V_COLS.VARIANT_NAME}), ''), NULLIF(BTRIM(v.${V_COLS.DISPLAY_NAME}), ''), p.${P_COLS.PACKAGE_NAME}) AS variant_name,
      v.${V_COLS.DISPLAY_NAME} AS display_name,
      v.${V_COLS.DESCRIPTION} AS description,
      v.${V_COLS.DESCRIPTION_PUBLISHED_VERSION} AS published_version,
      COALESCE(p_retail.${VP_COLS.PRICE}, 0) AS retail_price,
      COALESCE(p_promo.${VP_COLS.PRICE}, 0) AS promo_price
    FROM ${TABLES.VARIANT} v
    JOIN ${TABLES.PRODUCT} p ON p.${P_COLS.ID} = v.${V_COLS.PRODUCT_ID}
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_retail
      ON p_retail.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID}
     AND p_retail.${VP_COLS.TIER_ID} = 2
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_promo
      ON p_promo.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID}
     AND p_promo.${VP_COLS.TIER_ID} = 3
    WHERE v.${V_COLS.IS_ACTIVE} = true
      AND (p.${P_COLS.IS_ACTIVE} IS NULL OR p.${P_COLS.IS_ACTIVE} = true)
      AND COALESCE(p_retail.${VP_COLS.PRICE}, 0) > 0
  `;

  const result = await db.raw(sql);
  const rows = result.rows || [];

  const categoryCounts = new Map();
  const items = rows.map((row) => {
    const retailPrice = Math.round(Number(row.retail_price || 0));
    const promoRaw = Math.round(Number(row.promo_price || 0));
    const promoPrice = promoRaw > 0 ? promoRaw : null;

    const category = resolveCategoryName(row.category);
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

    const variantName = String(row.variant_name || "").trim();
    const { duration, durationMonths, variantGroup } = parseVariantDurationAndGroup(
      row.display_name,
      variantName
    );

    return {
      id: Number(row.id),
      product_id: Number(row.product_id),
      product_name: String(row.product_name || "").trim() || "Sản phẩm",
      image_url: row.image_url ? String(row.image_url).trim() : null,
      category,
      category_slug: slugifyCategory(category),
      variant_name: variantName,
      variant_group: variantGroup,
      duration,
      duration_months: durationMonths,
      desc: row.published_version
        ? htmlToText(row.description || "", {
          wordwrap: false,
          selectors: [
            { selector: "a", options: { ignoreHref: true } },
            { selector: "img", format: "skip" },
          ],
        }).trim()
        : String(row.description || "").trim(),
      price: retailPrice,
      promo_price: promoPrice,
    };
  });

  // Sắp xếp để các biến thể cùng Product và cùng đoạn đầu Variant luôn liền kề nhau theo thời hạn tăng dần
  items.sort((a, b) => {
    const catOrderDiff = getCategoryOrderIndex(a.category) - getCategoryOrderIndex(b.category);
    if (catOrderDiff !== 0) return catOrderDiff;

    const catNameDiff = a.category.localeCompare(b.category, "vi");
    if (catNameDiff !== 0) return catNameDiff;

    const prodNameDiff = a.product_name.localeCompare(b.product_name, "vi");
    if (prodNameDiff !== 0) return prodNameDiff;

    if (a.product_id !== b.product_id) return a.product_id - b.product_id;

    const groupDiff = a.variant_group.localeCompare(b.variant_group, "vi");
    if (groupDiff !== 0) return groupDiff;

    const durA = a.duration_months ?? Number.MAX_SAFE_INTEGER;
    const durB = b.duration_months ?? Number.MAX_SAFE_INTEGER;
    if (durA !== durB) return durA - durB;

    if (a.price !== b.price) return a.price - b.price;
    return a.id - b.id;
  });

  const categories = Array.from(categoryCounts.entries())
    .map(([name, count]) => ({
      name,
      slug: slugifyCategory(name),
      count,
    }))
    .sort((a, b) => {
      const idxDiff = getCategoryOrderIndex(a.name) - getCategoryOrderIndex(b.name);
      if (idxDiff !== 0) return idxDiff;
      return a.name.localeCompare(b.name, "vi");
    });

  return {
    categories,
    items,
    total: items.length,
    updated_at: new Date().toISOString(),
  };
}

module.exports = {
  DEFAULT_CATEGORY_ORDER,
  parseVariantDurationAndGroup,
  getPublicPriceList,
};
