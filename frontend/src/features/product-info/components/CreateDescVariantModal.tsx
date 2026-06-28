import React, { useCallback, useEffect, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { createProductDescription } from "@/features/product-info/api/productDescApi";
import { normalizeErrorMessage } from "@/lib/textUtils";
import {
  normalizeRichHtmlForSave,
  normalizeShortDescriptionForSave,
} from "@/shared/html";
import { DescVariantContentFields } from "./DescVariantContentFields";
import { useWebsiteSeoAudit } from "./EditProductModal/useWebsiteSeoAudit";

type CreateDescVariantModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
};

export const CreateDescVariantModal: React.FC<CreateDescVariantModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const [shortDescription, setShortDescription] = useState("");
  const [rulesHtml, setRulesHtml] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setShortDescription("");
    setRulesHtml("");
    setDescriptionHtml("");
    setSaveError(null);
    setSaving(false);
  }, [open]);

  const {
    evaluation: seoEvaluation,
    loading: seoAuditLoading,
    error: seoAuditError,
  } = useWebsiteSeoAudit({
    shortDescription,
    rulesHtml,
    descriptionHtml,
  });

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await createProductDescription({
        rules: normalizeRichHtmlForSave(rulesHtml),
        description: normalizeRichHtmlForSave(descriptionHtml),
        shortDesc: normalizeShortDescriptionForSave(shortDescription),
      });
      await onCreated();
      onClose();
    } catch (e) {
      setSaveError(
        normalizeErrorMessage(
          e instanceof Error ? e.message : String(e ?? ""),
          { fallback: "Không thể tạo desc_variant." }
        )
      );
    } finally {
      setSaving(false);
    }
  }, [rulesHtml, descriptionHtml, shortDescription, onCreated, onClose]);

  if (!open) return null;

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
        aria-labelledby="create-desc-variant-title"
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
              id="create-desc-variant-title"
              className="product-edit-modal__title text-3xl font-bold"
            >
              Thêm thông tin sản phẩm
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-white/62">
              Tạo bản ghi mới trong{" "}
              <span className="font-mono text-indigo-200/95">desc_variant</span>
              . Gắn với variant sẽ có luồng riêng sau. Trên: mô tả ngắn (gọn);
              dưới: quy tắc và thông tin cạnh nhau (HTML). Cuối form là đánh giá
              SEO.
            </p>
          </div>

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
            panelClassName="mt-6 p-5"
          />
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
            {saving ? "Đang tạo…" : "Tạo nội dung"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
