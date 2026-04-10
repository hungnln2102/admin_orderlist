import React, { useEffect, useMemo, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ProductDescription } from "@/lib/productDescApi";
import {
  htmlToPlainText,
  normalizeRichHtmlForSave,
  normalizeShortDescriptionForSave,
  toHtmlFromPlain,
} from "../utils/productInfoHelpers";
import ImageUpload from "./EditProductModal/ImageUpload";
import RichTextEditor from "./EditProductModal/RichTextEditor";
import { SeoPreviewPanel } from "./EditProductModal/SeoPreviewPanel";
import { useWebsiteSeoAudit } from "./EditProductModal/useWebsiteSeoAudit";

const META_LABEL =
  "product-edit-modal__label mb-2 block text-[11px] font-semibold uppercase tracking-wide";

type DescVariantEditModalProps = {
  item: ProductDescription | null;
  saving: boolean;
  saveError: string | null;
  onClose: () => void;
  onSave: (payload: {
    productId: string;
    descVariantId: number | null;
    rules: string;
    description: string;
    shortDesc: string;
    imageUrl: string | null;
  }) => Promise<void>;
};

export const DescVariantEditModal: React.FC<DescVariantEditModalProps> = ({
  item,
  saving,
  saveError,
  onClose,
  onSave,
}) => {
  const initial = useMemo(
    () => ({
      rulesHtml: normalizeRichHtmlForSave(
        item?.rulesHtml || toHtmlFromPlain(item?.rules || "")
      ),
      descriptionHtml: normalizeRichHtmlForSave(
        item?.descriptionHtml || toHtmlFromPlain(item?.description || "")
      ),
      shortDescription: htmlToPlainText(item?.shortDescription || ""),
      imageUrl: item?.imageUrl || "",
    }),
    [item]
  );

  const [rulesHtml, setRulesHtml] = useState(initial.rulesHtml);
  const [descriptionHtml, setDescriptionHtml] = useState(
    initial.descriptionHtml
  );
  const [shortDescription, setShortDescription] = useState(
    initial.shortDescription
  );
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);

  useEffect(() => {
    if (!item) return;
    setRulesHtml(initial.rulesHtml);
    setDescriptionHtml(initial.descriptionHtml);
    setShortDescription(initial.shortDescription);
    setImageUrl(initial.imageUrl);
  }, [item, initial]);

  const {
    evaluation: seoEvaluation,
    loading: seoAuditLoading,
    error: seoAuditError,
  } = useWebsiteSeoAudit({
    shortDescription,
    rulesHtml,
    descriptionHtml,
  });

  if (!item) return null;

  const handleSubmit = async () => {
    const rules = normalizeRichHtmlForSave(rulesHtml);
    const description = normalizeRichHtmlForSave(descriptionHtml);
    const shortDesc = normalizeShortDescriptionForSave(shortDescription);
    await onSave({
      productId: item.productId.trim(),
      descVariantId: item.descVariantId ?? null,
      rules,
      description,
      shortDesc,
      imageUrl: imageUrl.trim() || null,
    });
  };

  return (
    <ModalPortal>
    <div
      className="product-edit-modal__overlay fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="product-edit-modal relative flex w-full max-w-[1240px] flex-col overflow-hidden rounded-[34px] border"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="desc-variant-edit-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="product-edit-modal__close absolute right-6 top-6 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full"
          aria-label="Đóng"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="product-edit-modal__body flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className="product-edit-modal__header text-center">
            <h2
              id="desc-variant-edit-title"
              className="product-edit-modal__title text-3xl font-bold"
            >
              Nội dung sản phẩm
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-white/62">
              Chuẩn hóa nội dung theo đánh giá SEO{" "}
              (preview render thật từ Website) — cột{" "}
              <span className="font-mono text-indigo-200/95">
                rules · description · short_desc
              </span>{" "}
              trên{" "}
              <span className="font-mono text-indigo-200/95">desc_variant</span>
              . Ảnh lưu trên biến thể.
            </p>
          </div>

          <div className="product-edit-modal__layout">
            <aside className="product-edit-modal__sidebar">
              <section className="product-edit-modal__image-frame">
                <ImageUpload
                  imageUrl={imageUrl}
                  onImageChange={(url) => setImageUrl(url)}
                  onImageRemove={() => setImageUrl("")}
                />
              </section>
              <div className="flex min-w-0 flex-col justify-center gap-4">
                <div>
                  <span className={META_LABEL}>ID bản ghi (desc_variant)</span>
                  <input
                    readOnly
                    className="product-edit-modal__input w-full cursor-not-allowed opacity-90"
                    value={
                      item.descVariantId != null
                        ? String(item.descVariantId)
                        : "—"
                    }
                  />
                </div>
                <div>
                  <span className={META_LABEL}>Mã variant (product_id)</span>
                  <input
                    readOnly
                    className="product-edit-modal__input w-full cursor-not-allowed font-mono text-sm opacity-90"
                    value={item.productId}
                  />
                </div>
                <div>
                  <span className={META_LABEL}>Tên hiển thị (tham khảo)</span>
                  <input
                    readOnly
                    className="product-edit-modal__input w-full cursor-not-allowed opacity-90"
                    value={item.productName || "—"}
                  />
                </div>
              </div>
            </aside>

            <section className="product-edit-modal__panel product-edit-modal__panel--editor p-5">
              <div className="product-edit-modal__editor-stack">
                <section className="product-edit-modal__content-block">
                  <div className="product-edit-modal__content-head">
                    <div className="product-edit-modal__content-copy">
                      <p className="product-edit-modal__content-kicker">
                        short_desc
                      </p>
                      <h3 className="product-edit-modal__content-title">
                        Mô tả ngắn
                      </h3>
                      <p className="product-edit-modal__content-summary">
                        Meta / teaser — giữ ngắn.
                      </p>
                    </div>
                    <span className="product-edit-modal__content-badge product-edit-modal__content-badge--description">
                      Plain text
                    </span>
                  </div>
                  <textarea
                    className="product-edit-modal__textarea max-h-[140px] min-h-[88px] w-full rounded-[18px]"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Nhập mô tả ngắn…"
                    rows={3}
                  />
                </section>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
                  <section className="product-edit-modal__content-block flex h-full min-h-0 flex-col">
                    <div className="product-edit-modal__content-head">
                      <div className="product-edit-modal__content-copy">
                        <p className="product-edit-modal__content-kicker">
                          rules
                        </p>
                        <h3 className="product-edit-modal__content-title">
                          Quy tắc
                        </h3>
                        <p className="product-edit-modal__content-summary">
                          Điều kiện, lưu ý — HTML.
                        </p>
                      </div>
                      <span className="product-edit-modal__content-badge product-edit-modal__content-badge--rules">
                        HTML / CMS
                      </span>
                    </div>
                    <div className="min-h-0 flex-1">
                      <RichTextEditor
                        label="Quy tắc (rules)"
                        value={rulesHtml}
                        onChange={setRulesHtml}
                        placeholder="Soạn quy tắc, hướng dẫn…"
                        minHeight="280px"
                      />
                    </div>
                  </section>

                  <section className="product-edit-modal__content-block flex h-full min-h-0 flex-col">
                    <div className="product-edit-modal__content-head">
                      <div className="product-edit-modal__content-copy">
                        <p className="product-edit-modal__content-kicker">
                          description
                        </p>
                        <h3 className="product-edit-modal__content-title">
                          Thông tin / mô tả
                        </h3>
                        <p className="product-edit-modal__content-summary">
                          Nội dung chi tiết — HTML.
                        </p>
                      </div>
                      <span className="product-edit-modal__content-badge product-edit-modal__content-badge--description">
                        HTML / CMS
                      </span>
                    </div>
                    <div className="min-h-0 flex-1">
                      <RichTextEditor
                        label="Thông tin / mô tả (description)"
                        value={descriptionHtml}
                        onChange={setDescriptionHtml}
                        placeholder="Soạn mô tả chi tiết…"
                        minHeight="280px"
                      />
                    </div>
                  </section>
                </div>

                <SeoPreviewPanel
                  evaluation={seoEvaluation}
                  loading={seoAuditLoading}
                  error={seoAuditError}
                />
              </div>
            </section>
          </div>
        </div>

        {saveError ? (
          <div
            className="mx-6 rounded-xl border border-rose-400/35 bg-rose-500/12 px-4 py-3 text-sm text-rose-100 sm:mx-8"
            role="alert"
          >
            {saveError}
          </div>
        ) : null}

        <div className="product-edit-modal__footer flex items-center justify-end gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="product-edit-modal__button product-edit-modal__button--ghost"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="product-edit-modal__button product-edit-modal__button--primary"
          >
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
