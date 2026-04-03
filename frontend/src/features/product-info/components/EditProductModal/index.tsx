import React, { useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  htmlToPlainText,
  normalizeRichHtmlForSave,
  toHtmlFromPlain,
} from "../../utils/productInfoHelpers";
import { BasicInfoPanel } from "./BasicInfoPanel";
import ImageUpload from "./ImageUpload";
import { SeoContentSection } from "./SeoContentSection";
import { SeoPreviewPanel } from "./SeoPreviewPanel";
import { EditFormState, EditProductModalProps } from "./types";
import { useWebsiteSeoAudit } from "./useWebsiteSeoAudit";

const INPUT_BASE =
  "product-edit-modal__input w-full rounded-xl border px-4 py-3.5 text-sm text-white placeholder:text-slate-400 outline-none transition-all";
const LABEL_BASE =
  "product-edit-modal__label mb-2 block text-xs font-semibold uppercase tracking-wide";

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  saving,
  onClose,
  onSave,
}) => {
  const initialForm = useMemo<EditFormState>(
    () => ({
      productId: product?.productId || "",
      productName: product?.packageProduct || product?.productName || "",
      packageName: product?.packageName || "",
      shortDescription: htmlToPlainText(product?.shortDescription || ""),
      rules: product?.rules || "",
      rulesHtml: normalizeRichHtmlForSave(
        product?.rulesHtml || toHtmlFromPlain(product?.rules || "")
      ),
      description: product?.description || "",
      descriptionHtml: normalizeRichHtmlForSave(
        product?.descriptionHtml || toHtmlFromPlain(product?.description || "")
      ),
      imageUrl: product?.imageUrl || "",
      priceId: product?.priceId ?? null,
    }),
    [product]
  );

  const [form, setForm] = useState<EditFormState>(initialForm);

  useEffect(() => {
    if (!product) return;
    setForm(initialForm);
  }, [initialForm, product]);

  const {
    evaluation: seoEvaluation,
    loading: seoAuditLoading,
    error: seoAuditError,
  } = useWebsiteSeoAudit({
    shortDescription: form.shortDescription,
    rulesHtml: form.rulesHtml,
    descriptionHtml: form.descriptionHtml,
  });

  const handleSubmit = () => {
    onSave(form);
  };

  if (!product) return null;

  return (
    <div className="product-edit-modal__overlay fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="product-edit-modal relative flex w-full max-w-[1240px] flex-col overflow-hidden rounded-[34px] border">
        <button
          onClick={onClose}
          className="product-edit-modal__close absolute right-6 top-6 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full"
          aria-label="Đóng"
          type="button"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="product-edit-modal__body flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className="product-edit-modal__header text-center">
            <h2 className="product-edit-modal__title text-3xl font-bold">
              Chỉnh sửa thông tin sản phẩm
            </h2>
          </div>

          <div className="product-edit-modal__layout">
            <aside className="product-edit-modal__sidebar">
              <section className="product-edit-modal__image-frame">
                <ImageUpload
                  imageUrl={form.imageUrl}
                  onImageChange={(url) =>
                    setForm((prev) => ({ ...prev, imageUrl: url }))
                  }
                  onImageRemove={() =>
                    setForm((prev) => ({ ...prev, imageUrl: "" }))
                  }
                />
              </section>

              <BasicInfoPanel
                form={form}
                setForm={setForm}
                inputBase={INPUT_BASE}
                labelBase={LABEL_BASE}
              />
            </aside>

            <section className="product-edit-modal__panel product-edit-modal__panel--editor p-5">
              <div className="product-edit-modal__editor-stack">
                <div className="product-edit-modal__editor-row">
                  <SeoContentSection
                    kicker="Cấu trúc nội dung"
                    title="Quy tắc sản phẩm"
                    description="Dùng để viết điều kiện sử dụng, lưu ý, checklist và hướng dẫn ngắn cho khách hàng."
                    badgeText="HTML SEO"
                    badgeClassName="product-edit-modal__content-badge product-edit-modal__content-badge--rules"
                    editorLabel="Quy tắc sản phẩm"
                    editorValue={form.rulesHtml || ""}
                    editorPlaceholder="Nhập quy tắc sản phẩm..."
                    onEditorChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        rulesHtml: value,
                        rules: value.replace(/<[^>]*>/g, ""),
                      }))
                    }
                  />

                  <SeoContentSection
                    kicker="Nội dung chính"
                    title="Mô tả sản phẩm"
                    description="Dùng để viết nội dung chính của trang: H1 mở bài, các section H2 và phần mô tả chi tiết."
                    badgeText="HTML SEO"
                    badgeClassName="product-edit-modal__content-badge product-edit-modal__content-badge--description"
                    editorLabel="Mô tả sản phẩm"
                    editorValue={form.descriptionHtml || ""}
                    editorPlaceholder="Nhập mô tả chi tiết sản phẩm..."
                    onEditorChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        descriptionHtml: value,
                        description: value.replace(/<[^>]*>/g, ""),
                      }))
                    }
                  />
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
            onClick={handleSubmit}
            disabled={saving}
            className="product-edit-modal__button product-edit-modal__button--primary"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
};

export type { SavePayload } from "./types";
