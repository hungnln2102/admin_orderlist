import React, { useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  htmlToPlainText,
  normalizeRichHtmlForSave,
  toHtmlFromPlain,
} from "../../utils/productInfoHelpers";
import ImageUpload from "./ImageUpload";
import RichTextEditor from "./RichTextEditor";
import { EditFormState, EditProductModalProps } from "./types";

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

  const handleSubmit = () => {
    onSave(form);
  };

  if (!product) return null;

  const inputBase =
    "product-edit-modal__input w-full rounded-xl border px-4 py-3.5 text-sm text-white placeholder:text-slate-400 outline-none transition-all";
  const labelBase =
    "product-edit-modal__label mb-2 block text-xs font-semibold uppercase tracking-wide";

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

          <div className="product-edit-modal__layout grid gap-6 xl:grid-cols-[368px_minmax(0,1fr)]">
            <aside className="product-edit-modal__sidebar space-y-5">
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

              <section className="product-edit-modal__panel product-edit-modal__panel--basic p-5">
                <h3 className="product-edit-modal__panel-title mb-5">
                  Thông Tin Cơ Bản
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className={labelBase}>Mã sản phẩm</label>
                    <input
                      type="text"
                      value={form.productId}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, productId: e.target.value }))
                      }
                      placeholder="Nhập mã sản phẩm..."
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <label className={labelBase}>Tên sản phẩm</label>
                    <input
                      type="text"
                      value={form.productName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          productName: e.target.value,
                        }))
                      }
                      placeholder="Nhập tên sản phẩm..."
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <label className={labelBase}>Gói sản phẩm</label>
                    <input
                      type="text"
                      value={form.packageName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          packageName: e.target.value,
                        }))
                      }
                      placeholder="Nhập gói sản phẩm..."
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <label className={labelBase}>Mô tả ngắn</label>
                    <p className="product-edit-editor__helper mb-2">
                      Viết 1-2 câu ngắn, chứa từ khóa chính và lợi ích nổi bật
                      của sản phẩm. Khi lưu sẽ được chuyển thành đoạn HTML `p`
                      chuẩn SEO.
                    </p>
                    <textarea
                      value={form.shortDescription}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          shortDescription: e.target.value,
                        }))
                      }
                      rows={4}
                      placeholder="Nhập mô tả ngắn về sản phẩm..."
                      className={`${inputBase} product-edit-modal__textarea resize-none`}
                    />
                  </div>
                </div>
              </section>
            </aside>

            <section className="product-edit-modal__panel product-edit-modal__panel--editor p-5">
              <div className="space-y-5">
                <div className="product-edit-modal__seo-note rounded-2xl border px-4 py-3 text-sm">
                  HTML khi lưu sẽ tự chuẩn hóa về `p`, `h2-h4`, `ul/ol/li`,
                  `strong/em`, `a`, `blockquote`. Không dùng `H1` trong mô tả
                  sản phẩm để tránh xung đột SEO trên trang chi tiết.
                </div>

                <RichTextEditor
                  label="Quy tắc sản phẩm"
                  helperText="Dùng H2 cho tiêu đề section, H3 cho mục con, danh sách cho điều kiện hoặc lưu ý."
                  value={form.rulesHtml || ""}
                  onChange={(value) => {
                    setForm((prev) => ({
                      ...prev,
                      rulesHtml: value,
                      rules: value.replace(/<[^>]*>/g, ""),
                    }));
                  }}
                  placeholder="Nhập quy tắc sản phẩm..."
                  minHeight="140px"
                />

                <RichTextEditor
                  label="Mô tả sản phẩm"
                  helperText="Nên chia theo H2/H3, mỗi đoạn tập trung một ý chính và chèn liên kết nội bộ khi phù hợp."
                  value={form.descriptionHtml || ""}
                  onChange={(value) => {
                    setForm((prev) => ({
                      ...prev,
                      descriptionHtml: value,
                      description: value.replace(/<[^>]*>/g, ""),
                    }));
                  }}
                  placeholder="Nhập mô tả chi tiết sản phẩm..."
                  minHeight="188px"
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
