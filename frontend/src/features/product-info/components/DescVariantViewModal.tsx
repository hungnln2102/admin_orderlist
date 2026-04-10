import React, { useMemo } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ProductDescription } from "@/lib/productDescApi";
import {
  htmlToPlainText,
  sanitizeHtmlForDisplay,
  toHtmlFromPlain,
} from "../utils/productInfoHelpers";

type DescVariantViewModalProps = {
  item: ProductDescription | null;
  onClose: () => void;
};

export const DescVariantViewModal: React.FC<DescVariantViewModalProps> = ({
  item,
  onClose,
}) => {
  const rulesSafe = useMemo(
    () =>
      sanitizeHtmlForDisplay(
        item?.rulesHtml || toHtmlFromPlain(item?.rules || "")
      ) || "",
    [item]
  );

  const descriptionSafe = useMemo(
    () =>
      sanitizeHtmlForDisplay(
        item?.descriptionHtml || toHtmlFromPlain(item?.description || "")
      ) || "",
    [item]
  );

  const shortPlain = useMemo(() => {
    const t = htmlToPlainText(item?.shortDescription || "").trim();
    return t || null;
  }, [item]);

  const imageUrl = (item?.imageUrl || "").trim();

  if (!item) return null;

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
        aria-labelledby="desc-variant-view-title"
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
              id="desc-variant-view-title"
              className="product-edit-modal__title text-3xl font-bold"
            >
              Xem nội dung
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-white/62">
              Chỉ xem, không chỉnh sửa.
            </p>
          </div>

          <div className="product-edit-modal__layout">
            <aside className="product-edit-modal__sidebar">
              <section className="product-edit-modal__image-frame flex min-h-[200px] items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-black/25">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="max-h-[320px] w-full object-contain"
                  />
                ) : (
                  <p className="px-4 text-center text-sm text-white/45">
                    Chưa có ảnh biến thể
                  </p>
                )}
              </section>
            </aside>

            <section className="product-edit-modal__panel product-edit-modal__panel--editor p-5">
              <div className="product-edit-modal__editor-stack space-y-6">
                <section className="product-edit-modal__content-block">
                  <div className="product-edit-modal__content-head">
                    <div className="product-edit-modal__content-copy">
                      <p className="product-edit-modal__content-kicker">
                        short_desc
                      </p>
                      <h3 className="product-edit-modal__content-title">
                        Mô tả ngắn
                      </h3>
                    </div>
                    <span className="product-edit-modal__content-badge product-edit-modal__content-badge--description">
                      Plain text
                    </span>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white/85 whitespace-pre-wrap">
                    {shortPlain ?? (
                      <span className="text-white/45">Chưa có mô tả ngắn.</span>
                    )}
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
                  <section className="product-edit-modal__content-block">
                    <div className="product-edit-modal__content-head">
                      <div className="product-edit-modal__content-copy">
                        <p className="product-edit-modal__content-kicker">
                          rules
                        </p>
                        <h3 className="product-edit-modal__content-title">
                          Quy tắc
                        </h3>
                      </div>
                      <span className="product-edit-modal__content-badge product-edit-modal__content-badge--rules">
                        HTML
                      </span>
                    </div>
                    {rulesSafe ? (
                      <div
                        className="rich-display min-h-[120px] rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white/85 [&_a]:text-indigo-300 [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: rulesSafe }}
                      />
                    ) : (
                      <div className="min-h-[120px] rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/45">
                        Chưa có quy tắc.
                      </div>
                    )}
                  </section>

                  <section className="product-edit-modal__content-block">
                    <div className="product-edit-modal__content-head">
                      <div className="product-edit-modal__content-copy">
                        <p className="product-edit-modal__content-kicker">
                          description
                        </p>
                        <h3 className="product-edit-modal__content-title">
                          Thông tin / mô tả
                        </h3>
                      </div>
                      <span className="product-edit-modal__content-badge product-edit-modal__content-badge--description">
                        HTML
                      </span>
                    </div>
                    {descriptionSafe ? (
                      <div
                        className="rich-display min-h-[120px] rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white/85 [&_a]:text-indigo-300 [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: descriptionSafe }}
                      />
                    ) : (
                      <div className="min-h-[120px] rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/45">
                        Chưa có mô tả chi tiết.
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="product-edit-modal__footer flex items-center justify-end gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="product-edit-modal__button product-edit-modal__button--primary"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
