const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
require("module-alias/register");

const { db, TABLES, COLS } = require("@/db");
const { EVENTS } = require("@/events");
const { getProductPrices, updateProduct, updateVariantDescription } = require("@/domains/products/services/productService");
const { getPublicPriceList } = require("@/domains/products/services/publicPricingService");
const {
  getEditorial, getPublicDescription, saveEditorial, takeEditorialAction,
} = require("@/domains/products/services/variantDescriptionEditorialService");

const V = COLS.VARIANT;
const P = COLS.PRODUCT;
const E = COLS.DOMAIN_EVENT_STORE;
const editor = { id: 1, username: "editor", role: "admin" };
const reviewer = { id: 2, username: "reviewer", role: "owner" };

test("Variant CMS preserves the public description until review, publishes atomically, and restores to draft", async (t) => {
  const name = `Variant editorial ${randomUUID()}`;
  const legacy = "Mô tả & giá\nDòng thứ hai";
  const [product] = await db(TABLES.PRODUCT).insert({
    [P.PACKAGE_NAME]: name, [P.CATEGORY]: "Thiết kế & Đồ họa",
  }).returning(P.ID);
  const ids = [];
  t.after(async () => {
    try {
      await db(TABLES.DOMAIN_EVENT_STORE).where(E.AGGREGATE_TYPE, "PRODUCT").whereIn(E.AGGREGATE_ID, ids).del();
      await db(TABLES.PRODUCT).where(P.ID, product[P.ID]).del();
    } finally {
      await db.destroy();
    }
  });
  const createVariant = async (displayName, description = null) => {
    const [variant] = await db(TABLES.VARIANT).insert({
      [V.PRODUCT_ID]: product[P.ID],
      [V.DISPLAY_NAME]: displayName,
      [V.DESCRIPTION]: description,
    }).returning(V.ID);
    ids.push(variant[V.ID]);
    return variant[V.ID];
  };
  const id = await createVariant(name, legacy);
  const prices = COLS.VARIANT_PRICE;
  await db(TABLES.VARIANT_PRICE).insert({
    [prices.VARIANT_ID]: id, [prices.TIER_ID]: 2, [prices.PRICE]: 100_000,
  });

  const initial = await getEditorial(id, editor);
  assert.equal(initial.canPublish, false);
  assert.deepEqual(initial.draft, { html: "<p>Mô tả &amp; giá<br />Dòng thứ hai</p>", version: 0, status: "draft", note: null });
  assert.deepEqual(initial.published, { html: initial.draft.html, version: 0 });
  assert.equal(await getPublicDescription(name), null);

  const html = [
    '<p style="text-align:center;position:fixed" data-indent="1"><strong><u>Mô tả</u> <s>mới</s></strong></p>',
    '<figure style="text-align:right"><img src="https://example.com/product.png" alt="Ảnh" onclick="dismiss()"><figcaption>Chú thích</figcaption></figure>',
    '<hr><table style="text-align:left"><tbody><tr><th colspan="100" rowspan="101">Tiêu đề</th></tr>',
    '<tr><td colspan="0" rowspan="100"><span style="color: rgb(220, 38, 38); position:fixed">Đỏ</span></td>',
    '<td><mark style="background-color:#fef08a">Vàng</mark><span style="color:#ffffff">Trắng</span></td></tr></tbody></table>',
    '<iframe title="Không giữ"></iframe>',
  ].join("");
  const sanitizedHtml = [
    '<p style="text-align:center"><strong><u>Mô tả</u> <s>mới</s></strong></p>',
    '<figure style="text-align:right"><img src="https://example.com/product.png" alt="Ảnh" /><figcaption>Chú thích</figcaption></figure>',
    '<hr /><table><tbody><tr><th colspan="100">Tiêu đề</th></tr>',
    '<tr><td rowspan="100"><span style="color:#dc2626">Đỏ</span></td>',
    '<td><mark style="background-color:#fef08a">Vàng</mark><span>Trắng</span></td></tr></tbody></table>',
  ].join("");
  const concurrent = await Promise.allSettled([
    saveEditorial(id, { version: 0, html }, editor),
    saveEditorial(id, { version: 0, html }, editor),
  ]);
  const saved = concurrent.find((result) => result.status === "fulfilled").value;
  assert.equal(concurrent.find((result) => result.status === "rejected").reason.statusCode, 409);
  assert.equal(saved.draft.html, sanitizedHtml);
  assert.equal(saved.published.version, 0);
  const legacyRevision = saved.history.find((row) => row.action === "legacy");
  assert.ok(legacyRevision);
  await assert.rejects(updateVariantDescription(id, "Ghi trực tiếp"), { statusCode: 409 });
  await assert.rejects(updateProduct(id, { description: "Ghi trực tiếp" }), { statusCode: 409 });
  await updateVariantDescription(id, legacy);
  assert.equal((await db(TABLES.VARIANT).where(V.ID, id).first(V.DESCRIPTION))[V.DESCRIPTION], legacy);

  const submitted = await takeEditorialAction(id, { action: "submit", version: 1 }, editor);
  assert.equal(submitted.draft.status, "in_review");
  assert.equal((await getProductPrices({ search: name, editorialStatus: "in_review" })).data[0].editorial_version, 2);
  await assert.rejects(takeEditorialAction(id, { action: "publish", version: 2 }, editor), { statusCode: 403 });
  await assert.rejects(saveEditorial(id, { version: 2, html }, editor), { statusCode: 409 });
  const changes = await takeEditorialAction(id, { action: "request_changes", version: 2, note: "Bổ sung thông tin" }, reviewer);
  assert.equal(changes.draft.note, "Bổ sung thông tin");
  await takeEditorialAction(id, { action: "submit", version: 3 }, editor);
  const published = await takeEditorialAction(id, { action: "publish", version: 4 }, reviewer);
  assert.deepEqual(published.published, { html: saved.draft.html, version: 5 });
  assert.equal(published.draft.status, "published");
  assert.equal(published.canPublish, true);
  const filtered = await getProductPrices({ search: name, category: "Thiết kế & Đồ họa", editorialStatus: "published" });
  assert.equal(filtered.pagination.total, 1);
  assert.equal(String(filtered.data[0].id), String(id));
  assert.ok(filtered.data[0].published_at instanceof Date);
  assert.deepEqual(filtered.data[0].editorial_updated_at, filtered.data[0].published_at);
  assert.equal((await getProductPrices({ search: name, category: "Giải trí & Streaming" })).pagination.total, 0);
  assert.deepEqual(await getPublicDescription(name), { descriptionHtml: saved.draft.html });
  const publicPriceDescription = (await getPublicPriceList()).items.find((row) => row.id === Number(id)).desc;
  assert.match(publicPriceDescription, /Mô tả mới/);
  assert.match(publicPriceDescription, /Chú thích/);
  assert.doesNotMatch(publicPriceDescription, /<|example\.com/);

  const event = await db(TABLES.DOMAIN_EVENT_STORE)
    .where({ [E.AGGREGATE_ID]: id, [E.EVENT_NAME]: EVENTS.PRODUCT_UPDATED, [E.ACTION]: "publish" })
    .first();
  assert.equal(event[E.STATUS], "PUBLISHED");

  const duplicateId = await createVariant(name);
  assert.equal(await getPublicDescription(name), null);
  await assert.rejects(takeEditorialAction(duplicateId, {
    action: "restore", version: 0, revisionId: legacyRevision.id,
  }, editor), { statusCode: 404 });
  await db(TABLES.VARIANT).where(V.ID, duplicateId).update({ [V.IS_ACTIVE]: false });
  const restored = await takeEditorialAction(id, { action: "restore", version: 5, revisionId: legacyRevision.id }, editor);
  assert.equal(restored.draft.html, initial.draft.html);
  assert.equal(restored.draft.status, "draft");
  assert.deepEqual(restored.published, published.published);
  assert.deepEqual(await getPublicDescription(name), { descriptionHtml: saved.draft.html });
});
