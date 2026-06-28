import React, { useEffect, useMemo, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ProductDescription } from "@/features/product-info/api/productDescApi";
import {
  htmlToPlainText,
  normalizeRichHtmlForSave,
  normalizeShortDescriptionForSave,
  toHtmlFromPlain,
} from "@/shared/html";
import ImageUpload from "./EditProductModal/ImageUpload";
import { DescVariantContentFields } from "./DescVariantContentFields";
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

            <DescVariantContentFields
              shortDescription={shortDescription}
              rulesHtml={rulesHtml}
              descriptionHtml={descriptionHtml}
              onShortDescriptionChange={setShortDescription}
              onRulesHtmlChange={setRulesHtml}
              onDescriptionHtmlChange={setDescriptionHtml}
              seoEvaluation={seoEvaluation}
              seoAuditLoading={seoAuditLoading}
              seoAuditError={seoAuditError}
            />
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
