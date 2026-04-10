import React, { useCallback, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ORDER_FIELDS } from "../../../constants";
import * as Helpers from "../../../lib/helpers";
import { useEditOrderLogic } from "./hooks/useEditOrderLogic";
import { EditOrderModalProps, Order } from "./types";
import { getSupplyName, normalizeDateLike } from "./utils";
import { EditOrderIdentitySection } from "./components/EditOrderIdentitySection";
import { EditOrderMetaSection } from "./components/EditOrderMetaSection";
import { ModalPortal } from "@/components/ui/ModalPortal";

const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onSave,
}) => {
  const {
    formData,
    supplies,
    isCustomSupply,
    handleSupplySelect,
    resetForm,
    setFieldValue,
    handleCustomSupplyChange,
    toggleCustomSupply,
  } = useEditOrderLogic(order, isOpen);
  const [isSaving, setIsSaving] = useState(false);

  const stringField = (key: keyof Order): string =>
    formData ? String(formData[key] ?? "") : "";
  const numericField = (key: keyof Order): number =>
    formData ? Number(formData[key] ?? 0) || 0 : 0;

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const target = e.target;
      const { name, value } = target;
      const nextValue =
        target instanceof HTMLInputElement && target.type === "checkbox"
          ? (target.checked as unknown as Order[keyof Order])
          : (value as unknown as Order[keyof Order]);
      setFieldValue(name as keyof Order, nextValue);
    },
    [setFieldValue]
  );

  const supplySelectValue = useMemo(() => {
    if (!formData) return "";
    const found = supplies.find(
      (supply) => getSupplyName(supply) === formData[ORDER_FIELDS.SUPPLY]
    );
    return found ? String(found.id) : "";
  }, [formData, supplies]);

  const orderDateDisplay = useMemo(() => {
    if (!formData) return "";
    const raw = normalizeDateLike(
      formData.registration_date_display ||
        formData.registration_date ||
        formData[ORDER_FIELDS.ORDER_DATE]
    );
    return Helpers.formatDateToDMY(raw) || String(raw || "");
  }, [formData]);

  const orderExpiredDisplay = useMemo(() => {
    if (!formData) return "";
    const raw = normalizeDateLike(
      formData.expiry_date_display ||
        formData.expiry_date ||
        formData[ORDER_FIELDS.EXPIRY_DATE]
    );
    return Helpers.formatDateToDMY(raw) || String(raw || "");
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !formData) return null;

  return (
    <ModalPortal>
    <div className="edit-order-shell fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-lg p-2 sm:p-4 md:p-6">
      <div className="edit-order-panel custom-scroll w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-800/85 via-slate-800/80 to-indigo-900/85 text-slate-100 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.8),0_16px_40px_-26px_rgba(99,102,241,0.35)] backdrop-blur-xl">
        <div className="edit-order-header flex items-center justify-between border-b border-white/15 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 bg-white/10 backdrop-blur-md z-10 rounded-t-2xl">
          <h3 className="text-base sm:text-lg font-semibold text-slate-100">
            Chỉnh sửa đơn hàng
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <EditOrderIdentitySection
            supplies={supplies}
            isCustomSupply={isCustomSupply}
            supplySelectValue={supplySelectValue}
            stringField={stringField}
            onInputChange={handleInputChange}
            onSupplySelect={handleSupplySelect}
            onCustomSupplyChange={handleCustomSupplyChange}
            onToggleCustomSupply={toggleCustomSupply}
          />

          <EditOrderMetaSection
            orderDateDisplay={orderDateDisplay}
            orderExpiredDisplay={orderExpiredDisplay}
            stringField={stringField}
            numericField={numericField}
            onInputChange={handleInputChange}
          />

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-white/15 text-slate-100 hover:bg-white/10"
            >
              Hoàn tác
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/15 text-slate-100 hover:bg-white/10"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2 rounded-lg text-white font-medium transition-colors ${
                isSaving
                  ? "bg-white/20 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
              }`}
            >
              {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

export default EditOrderModal;
