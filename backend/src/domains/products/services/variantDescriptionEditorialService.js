const { db, TABLES, COLS, withTransaction } = require("@/db");
const { EVENTS, publishEventInTrx } = require("@/events");
const { legacyDescriptionHtml, sanitizeDescriptionHtml } = require("./variantDescriptionHtml");

const V = COLS.VARIANT;
const R = COLS.VARIANT_DESCRIPTION_REVISION;
const P = COLS.PRODUCT;
const STATUS = {
  DRAFT: "draft",
  IN_REVIEW: "in_review",
  CHANGES_REQUESTED: "changes_requested",
  PUBLISHED: "published",
};
const ACTIONS = new Set(["submit", "request_changes", "publish", "restore"]);
const REVIEWER_ROLES = new Set(["owner", "super_admin"]);
const MAX_HTML_SIZE = 100_000;
const MAX_NOTE_SIZE = 2_000;

const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const canReview = (actor) => REVIEWER_ROLES.has(String(actor?.role ?? "").trim().toLowerCase());

function parseId(rawId) {
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id <= 0) {
    throw fail(400, "Mã biến thể không hợp lệ.");
  }
  return id;
}

function draftFrom(variant) {
  return {
    html: variant[V.EDITORIAL_HTML] ?? legacyDescriptionHtml(variant[V.DESCRIPTION]),
    version: variant[V.EDITORIAL_VERSION],
    status: variant[V.EDITORIAL_STATUS] ?? STATUS.DRAFT,
    note: variant[V.EDITORIAL_NOTE],
  };
}

async function buildResponse(connection, variant, actor) {
  const draft = draftFrom(variant);
  const publishedVersion = variant[V.DESCRIPTION_PUBLISHED_VERSION];
  const published = publishedVersion !== null
    ? { html: variant[V.DESCRIPTION] ?? "", version: publishedVersion }
    : variant[V.DESCRIPTION]?.trim()
      ? { html: legacyDescriptionHtml(variant[V.DESCRIPTION]), version: 0 }
      : null;
  const history = await connection(TABLES.VARIANT_DESCRIPTION_REVISION)
    .where(R.VARIANT_ID, variant[V.ID])
    .where(R.VERSION, "<=", draft.version)
    .orderBy(R.VERSION, "desc")
    .select({ id: R.ID, html: R.HTML, action: R.ACTION, createdAt: R.CREATED_AT, actor: R.ACTOR, note: R.NOTE, version: R.VERSION });

  return { draft, published, history, canPublish: canReview(actor) };
}

async function getEditorial(rawId, actor) {
  const variant = await db(TABLES.VARIANT).where(V.ID, parseId(rawId)).first();
  if (!variant) throw fail(404, "Không tìm thấy biến thể.");
  return buildResponse(db, variant, actor);
}

async function getPublicDescription(displayName) {
  if (!displayName || displayName.length > 255) return null;

  const variants = await db({ v: TABLES.VARIANT })
    .leftJoin({ p: TABLES.PRODUCT }, `v.${V.PRODUCT_ID}`, `p.${P.ID}`)
    .where({ [`v.${V.DISPLAY_NAME}`]: displayName, [`v.${V.IS_ACTIVE}`]: true })
    .andWhere((query) => query.where(`p.${P.IS_ACTIVE}`, true).orWhereNull(`p.${P.IS_ACTIVE}`))
    .select(`v.${V.DESCRIPTION}`, `v.${V.DESCRIPTION_PUBLISHED_VERSION}`)
    .limit(2);
  if (variants.length !== 1 || variants[0][V.DESCRIPTION_PUBLISHED_VERSION] === null) return null;
  return { descriptionHtml: variants[0][V.DESCRIPTION] };
}

function nextStatus(action, status) {
  if (action === "restore") return STATUS.DRAFT;
  if (action === "save" && status !== STATUS.IN_REVIEW) return STATUS.DRAFT;
  if (action === "submit" && [STATUS.DRAFT, STATUS.CHANGES_REQUESTED].includes(status)) return STATUS.IN_REVIEW;
  if (action === "request_changes" && status === STATUS.IN_REVIEW) return STATUS.CHANGES_REQUESTED;
  if (action === "publish" && status === STATUS.IN_REVIEW) return STATUS.PUBLISHED;
  throw fail(409, "Trạng thái mô tả đã thay đổi hoặc không cho phép thao tác này.");
}

async function updateEditorial(rawId, action, input, actor) {
  const id = parseId(rawId);
  const { version, html, revisionId } = input;
  const note = typeof input.note === "string" ? input.note.trim() : null;
  if (!Number.isInteger(version) || version < 0 || version > 2_147_483_646) {
    throw fail(400, "Phiên bản mô tả không hợp lệ.");
  }
  if (action === "save" && (typeof html !== "string" || html.length > MAX_HTML_SIZE || html.includes("\0"))) {
    throw fail(400, "Nội dung mô tả phải là văn bản và không quá 100.000 ký tự.");
  }
  if (input.note != null && (note === null || note.length > MAX_NOTE_SIZE || note.includes("\0"))) {
    throw fail(400, "Ghi chú phải là văn bản và không quá 2.000 ký tự.");
  }
  if (["publish", "request_changes"].includes(action) && !canReview(actor)) {
    throw fail(403, "Bạn không có quyền duyệt mô tả.");
  }
  if (action === "request_changes" && !note) {
    throw fail(400, "Vui lòng nhập lý do yêu cầu chỉnh sửa.");
  }
  if (action === "restore" && (!Number.isInteger(revisionId) || revisionId <= 0 || revisionId > 2_147_483_647)) {
    throw fail(400, "Mã bản sửa đổi không hợp lệ.");
  }

  return withTransaction(async (trx) => {
    const variants = trx(TABLES.VARIANT).where(V.ID, id);
    const variant = await variants.clone().forUpdate().first();
    if (!variant) throw fail(404, "Không tìm thấy biến thể.");
    const draft = draftFrom(variant);
    if (draft.version !== version) throw fail(409, "Mô tả đã được cập nhật. Hãy tải lại phiên bản mới nhất.");
    const status = nextStatus(action, draft.status);

    let content = draft.html;
    if (action === "save") content = sanitizeDescriptionHtml(html);
    if (action === "restore") {
      const revision = await trx(TABLES.VARIANT_DESCRIPTION_REVISION).where({ [R.ID]: revisionId, [R.VARIANT_ID]: id }).first(R.HTML);
      if (!revision) throw fail(404, "Không tìm thấy bản sửa đổi của biến thể.");
      content = sanitizeDescriptionHtml(revision[R.HTML]);
    }
    if (action === "publish") content = sanitizeDescriptionHtml(content);

    const updates = {
      [V.EDITORIAL_HTML]: content,
      [V.EDITORIAL_STATUS]: status,
      [V.EDITORIAL_VERSION]: version + 1,
      [V.EDITORIAL_NOTE]: note || null,
    };
    if (action === "publish") {
      updates[V.DESCRIPTION] = content || null;
      updates[V.DESCRIPTION_PUBLISHED_VERSION] = version + 1;
      updates[V.UPDATED_AT] = trx.fn.now();
    }
    const [updated] = await variants.update(updates).returning("*");

    if (version === 0 && variant[V.DESCRIPTION]?.trim()) {
      await trx(TABLES.VARIANT_DESCRIPTION_REVISION).insert({
        [R.VARIANT_ID]: id,
        [R.VERSION]: 0,
        [R.HTML]: draft.html,
        [R.ACTION]: "legacy",
        [R.ACTOR]: "system",
      });
    }
    await trx(TABLES.VARIANT_DESCRIPTION_REVISION).insert({
      [R.VARIANT_ID]: id,
      [R.VERSION]: version + 1,
      [R.HTML]: content,
      [R.ACTION]: action,
      [R.NOTE]: note || null,
      [R.ACTOR]: actor.username || String(actor.id),
    });
    await publishEventInTrx(trx, {
      eventName: action === "publish" ? EVENTS.PRODUCT_UPDATED : EVENTS.VARIANT_DESCRIPTION_EDITORIAL_CHANGED,
      aggregateType: "PRODUCT",
      aggregateId: id,
      source: "PRODUCT",
      action,
      actorType: "USER",
      actorId: actor.id,
      payload: action === "publish"
        ? { id, changed_fields: ["description"], summary: "Xuất bản mô tả sản phẩm" }
        : { id, action, version: version + 1, status },
    });

    return buildResponse(trx, updated, actor);
  });
}

function saveEditorial(id, input, actor) {
  return updateEditorial(id, "save", input, actor);
}

function takeEditorialAction(id, input, actor) {
  if (!ACTIONS.has(input.action)) throw fail(400, "Thao tác biên tập không hợp lệ.");
  return updateEditorial(id, input.action, input, actor);
}

module.exports = { getEditorial, getPublicDescription, saveEditorial, takeEditorialAction };
