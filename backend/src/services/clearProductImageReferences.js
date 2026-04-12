const { db } = require("../db");
const { quoteIdent } = require("../utils/sql");
const {
  TABLES,
  productSchemaCols,
  variantCols,
} = require("../controllers/ProductsController/constants");

/**
 * Hai dạng path thường gặp trong DB (host khác nhau nhưng đều chứa đoạn này).
 * @param {string} fileName
 * @returns {[string, string]}
 */
function imageProductPathSegments(fileName) {
  const clean = String(fileName || "").trim();
  const encoded = encodeURIComponent(clean);
  return [`/image_product/${clean}`, `/image_product/${encoded}`];
}

/**
 * Gán NULL cho mọi cột đang trỏ tới file ảnh trong thư mục image_product (sau khi file đã xóa).
 * @param {string} fileName tên file trên đĩa (basename), ví dụ Canva-123.jpg
 * @returns {Promise<{ product: number, variant: number, banners: number, articles: number }>}
 */
async function clearProductImageReferences(fileName) {
  const [segRaw, segEnc] = imageProductPathSegments(fileName);
  const pImg = quoteIdent(productSchemaCols.imageUrl);
  const pUpd = quoteIdent(productSchemaCols.updatedAt);
  const vImg = quoteIdent(variantCols.imageUrl);
  const vUpd = quoteIdent(variantCols.updatedAt);

  const matchBoth = (colIdent) =>
    `(POSITION(?::text IN COALESCE(${colIdent}, '')) > 0 OR POSITION(?::text IN COALESCE(${colIdent}, '')) > 0)`;

  const resProduct = await db.raw(
    `
    UPDATE ${TABLES.product}
    SET ${pImg} = NULL, ${pUpd} = NOW()
    WHERE COALESCE(${pImg}, '') <> ''
      AND ${matchBoth(pImg)}
    `,
    [segRaw, segEnc]
  );

  const resVariant = await db.raw(
    `
    UPDATE ${TABLES.variant}
    SET ${vImg} = NULL, ${vUpd} = NOW()
    WHERE COALESCE(${vImg}, '') <> ''
      AND ${matchBoth(vImg)}
    `,
    [segRaw, segEnc]
  );

  const bannerImg = quoteIdent("image_url");
  const articleImg = quoteIdent("image_url");

  const resBanners = await db.raw(
    `
    UPDATE content.banners
    SET ${bannerImg} = NULL
    WHERE COALESCE(${bannerImg}, '') <> ''
      AND ${matchBoth(bannerImg)}
    `,
    [segRaw, segEnc]
  );

  const resArticles = await db.raw(
    `
    UPDATE content.articles
    SET ${articleImg} = NULL
    WHERE COALESCE(${articleImg}, '') <> ''
      AND ${matchBoth(articleImg)}
    `,
    [segRaw, segEnc]
  );

  const rowCount = (r) =>
    typeof r?.rowCount === "number"
      ? r.rowCount
      : typeof r?.rows?.length === "number"
        ? r.rows.length
        : 0;

  return {
    product: rowCount(resProduct),
    variant: rowCount(resVariant),
    banners: rowCount(resBanners),
    articles: rowCount(resArticles),
  };
}

module.exports = {
  clearProductImageReferences,
  imageProductPathSegments,
};
