import React, { useEffect, useMemo, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { ProductDescription } from "@/features/product-info/api/productDescApi";
import {
  htmlToPlainText,
  normalizeRichHtmlForSave,
  normalizeShortDescriptionForSave,
  toHtmlFromPlain,
} from "@/shared/html";
import ImageUpload from "../modals/EditProductModal/ImageUpload";
import { DescVariantContentFields } from "./DescVariantContentFields";
import { useWebsiteSeoAudit } from "../modals/EditProductModal/useWebsiteSeoAudit";

const META_LABEL =
  "product-edit-modal__label mb-2 block text-[11px] font-semibold uppercase tracking-wide";

type DescVariantFormModalProps = {
  mode: "create" | "edit" | "view";
  open: boolean;
  item: ProductDescription | null;
  saving?: boolean;
  saveError?: string | null;
  onClose: () => void;
  onSave?: (payload: {
    productId?: string;
    descVariantId?: number | null;
    rules: string;
    description: string;
    shortDesc: string;
    imageUrl?: string | null;
  }) => Promise<void>;
};

export const DescVariantFormModal: React.FC<DescVariantFormModalProps> = ({
  mode,
  open,
  item,
  saving = false,
  saveError = null,
  onClose,
  onSave,
}) => {
  const isView = mode === "view";
  const isCreate = mode === "create";

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
    [item, open]
  );

  const [rulesHtml, setRulesHtml] = useState(initial.rulesHtml);
  const [descriptionHtml, setDescriptionHtml] = useState(initial.descriptionHtml);
  const [shortDescription, setShortDescription] = useState(initial.shortDescription);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);

  useEffect(() => {
    if (!open) return;
    setRulesHtml(initial.rulesHtml);
    setDescriptionHtml(initial.descriptionHtml);
    setShortDescription(initial.shortDescription);
    setImageUrl(initial.imageUrl);
  }, [open, initial]);

  const {
    evaluation: seoEvaluation,
    loading: seoAuditLoading,
    error: seoAuditError,
  } = useWebsiteSeoAudit({
    shortDescription,
    rulesHtml,
    descriptionHtml,
  });

  if (!open) return null;

  const handleSubmit = async () => {
    if (isView || !onSave) return;
    const rules = normalizeRichHtmlForSave(rulesHtml);
    const description = normalizeRichHtmlForSave(descriptionHtml);
    const shortDesc = normalizeShortDescriptionForSave(shortDescription);
    await onSave({
      productId: item?.productId?.trim(),
      descVariantId: item?.descVariantId ?? null,
      rules,
      description,
      shortDesc,
      imageUrl: imageUrl.trim() || null,
    });
  };

  const title =
    mode === "create"
      ? "Tạo bản ghi dùng chung mới (Master)"
      : mode === "view"
      ? "Xem nội dung sản phẩm"
      : "Nội dung sản phẩm";

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
              <h2 className="product-edit-modal__title text-3xl font-bold">
                {title}
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-white/62">
                Chuẩn hóa nội dung theo đánh giá SEO (preview render thật từ Website) — cột{" "}
                <span className="font-mono text-indigo-200/95">
                  rules · description · short_desc
                </span>{" "}
                trên{" "}
                <span className="font-mono text-indigo-200/95">desc_variant</span>.
              </p>
            </div>

            <div className="product-edit-modal__layout">
              {/* Cột trái (Image + Meta) chỉ hiển thị khi Edit/View cụ thể */}
              {!isCreate && (
                <aside className="product-edit-modal__sidebar">
                  <section className="product-edit-modal__image-frame">
                    <ImageUpload
                      imageUrl={imageUrl}
                      onImageChange={isView ? () => {} : (url) => setImageUrl(url)}
                      onImageRemove={isView ? () => {} : () => setImageUrl("")}
                    />
                  </section>
                  <div className="flex min-w-0 flex-col justify-center gap-4">
                    <div>
                      <span className={META_LABEL}>ID bản ghi (desc_variant)</span>
                      <input
                        readOnly
                        className="product-edit-modal__input w-full cursor-not-allowed opacity-90"
                        value={item?.descVariantId ?? "?"}
                      />
                    </div>
                    <div>
                      <span className={META_LABEL}>Mã variant (product_id)</span>
                      <input
                        readOnly
                        className="product-edit-modal__input w-full cursor-not-allowed font-mono text-sm opacity-90"
                        value={item?.productId ?? "?"}
                      />
                    </div>
                    <div>
                      <span className={META_LABEL}>Tên hiển thị (tham khảo)</span>
                      <input
                        readOnly
                        className="product-edit-modal__input w-full cursor-not-allowed opacity-90"
                        value={item?.productName || "?"}
                      />
                    </div>
                  </div>
                </aside>
              )}

              {/* Form Content chính */}
              <DescVariantContentFields
                shortDescription={shortDescription}
                rulesHtml={rulesHtml}
                descriptionHtml={descriptionHtml}
                onShortDescriptionChange={isView ? () => {} : setShortDescription}
                onRulesHtmlChange={isView ? () => {} : setRulesHtml}
                onDescriptionHtmlChange={isView ? () => {} : setDescriptionHtml}
                seoEvaluation={seoEvaluation}
                seoAuditLoading={seoAuditLoading}
                seoAuditError={seoAuditError}
                panelClassName={isCreate ? "w-full max-w-4xl mx-auto p-5" : "p-5"}
              />
            </div>
          </div>

          {saveError && !isView ? (
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
              {isView ? "Đóng" : "Hủy bỏ"}
            </button>
            {!isView && (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={saving}
                className="product-edit-modal__button product-edit-modal__button--primary"
              >
                {saving ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
