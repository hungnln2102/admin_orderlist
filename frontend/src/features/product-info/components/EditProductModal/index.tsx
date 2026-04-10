import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  fetchProductDescriptions,
  ProductDescription,
} from "@/lib/productDescApi";
import { htmlToPlainText } from "../../utils/productInfoHelpers";
import { BasicInfoPanel } from "./BasicInfoPanel";
import ImageUpload from "./ImageUpload";
import { EditFormState, EditProductModalProps } from "./types";
import { normalizeErrorMessage } from "@/lib/textUtils";

const INPUT_BASE =
  "product-edit-modal__input w-full rounded-xl border px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none transition-all";
const LABEL_BASE =
  "product-edit-modal__label mb-1 block text-[10px] font-semibold uppercase tracking-wide";

function descVariantOptionLabel(row: ProductDescription): string {
  const id = row.descVariantId;
  if (id == null || id <= 0) return "";
  const short = (row.shortDescription || "").trim().replace(/\s+/g, " ");
  const fromRules = htmlToPlainText(row.rulesHtml || row.rules || "")
    .replace(/\s+/g, " ")
    .trim();
  const preview = (short || fromRules).slice(0, 56);
  return `#${id}${preview ? ` — ${preview}${preview.length >= 56 ? "…" : ""}` : ""}`;
}

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
      descVariantId:
        product?.descVariantId != null && product.descVariantId > 0
          ? product.descVariantId
          : null,
      imageUrl: product?.imageUrl || "",
      priceId: product?.priceId ?? null,
    }),
    [product]
  );

  const [form, setForm] = useState<EditFormState>(initialForm);
  const [descOptions, setDescOptions] = useState<ProductDescription[]>([]);
  const [descLoading, setDescLoading] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    setForm(initialForm);
  }, [initialForm, product]);

  const loadDescOptions = useCallback(async () => {
    setDescLoading(true);
    setDescError(null);
    try {
      const res = await fetchProductDescriptions({
        scope: "desc_variant",
        limit: 2000,
        offset: 0,
      });
      const sorted = [...res.items].sort((a, b) => {
        const idA = a.descVariantId ?? 0;
        const idB = b.descVariantId ?? 0;
        return idA - idB;
      });
      setDescOptions(sorted);
    } catch (e) {
      setDescError(
        normalizeErrorMessage(
          e instanceof Error ? e.message : String(e ?? ""),
          { fallback: "Không tải được danh sách desc_variant." }
        )
      );
      setDescOptions([]);
    } finally {
      setDescLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!product) return;
    void loadDescOptions();
  }, [product, loadDescOptions]);

  const handleSubmit = () => {
    onSave(form);
  };

  if (!product) return null;

  return (
    <ModalPortal>
    <div className="product-edit-modal__overlay fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="product-edit-modal product-edit-modal--compact relative flex w-full max-w-[1240px] flex-col overflow-hidden rounded-[34px] border">
        <button
          onClick={onClose}
          className="product-edit-modal__close absolute right-6 top-6 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full"
          aria-label="Đóng"
          type="button"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="product-edit-modal__body flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div className="product-edit-modal__header text-center">
            <h2 className="product-edit-modal__title text-2xl font-bold sm:text-[1.65rem]">
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

            <section className="product-edit-modal__panel product-edit-modal__panel--editor p-3 sm:p-4">
              <div className="product-edit-modal__editor-stack gap-2">
                <div className="product-edit-modal__content-block rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                  <div className="product-edit-modal__content-head mb-2">
                    <div className="product-edit-modal__content-copy max-w-none">
                      <p className="product-edit-modal__content-kicker !mb-0.5 !text-[0.65rem]">
                        desc_variant
                      </p>
                      <h3 className="product-edit-modal__content-title !text-base">
                        Nội dung gắn với biến thể
                      </h3>
                      <p className="product-edit-modal__content-summary !mt-1 !text-xs !leading-snug">
                        Chọn bản ghi trong bảng{" "}
                        <span className="font-mono text-indigo-200/90">
                          desc_variant
                        </span>
                        . Khi lưu, hệ thống ghi{" "}
                        <span className="font-mono text-indigo-200/90">
                          id
                        </span>{" "}
                        đó vào cột{" "}
                        <span className="font-mono text-indigo-200/90">
                          id_desc
                        </span>{" "}
                        của variant.
                      </p>
                    </div>
                  </div>

                  <label htmlFor="edit-product-desc-variant" className={LABEL_BASE}>
                    Chọn nội dung
                  </label>
                  <select
                    id="edit-product-desc-variant"
                    className={INPUT_BASE}
                    disabled={descLoading || saving}
                    value={form.descVariantId ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const num =
                        raw === "" ? null : Number.parseInt(raw, 10);
                      const nextId =
                        num != null && Number.isFinite(num) && num > 0
                          ? num
                          : null;
                      setForm((prev) => ({
                        ...prev,
                        descVariantId: nextId,
                      }));
                    }}
                  >
                    <option value="">
                      {descLoading
                        ? "Đang tải danh sách…"
                        : "— Chọn bản ghi desc_variant —"}
                    </option>
                    {descOptions.map((row) => {
                      const id = row.descVariantId;
                      if (id == null || id <= 0) return null;
                      return (
                        <option key={id} value={id}>
                          {descVariantOptionLabel(row)}
                        </option>
                      );
                    })}
                  </select>
                  {descError ? (
                    <p
                      className="mt-2 text-sm text-rose-300"
                      role="alert"
                    >
                      {descError}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="product-edit-modal__footer flex items-center justify-end gap-2 px-4 py-3 sm:px-5">
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
            disabled={saving || descLoading}
            className="product-edit-modal__button product-edit-modal__button--primary"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export type { SavePayload } from "./types";
