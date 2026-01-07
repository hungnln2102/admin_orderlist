import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CAPACITY_LIMIT,
  DEFAULT_SLOT_LIMIT,
  EMPTY_FORM_VALUES,
  PackageField,
  PackageFormValues,
  PackageTemplate,
  SlotLinkMode,
  SLOT_LINK_OPTIONS,
} from "../../utils/packageHelpers";
import { ModalShell } from "./ModalShell";

export type PackageFormModalProps = {
  open: boolean;
  mode: "add" | "edit";
  template: PackageTemplate;
  initialValues?: PackageFormValues;
  onClose: () => void;
  onSubmit: (values: PackageFormValues) => void;
};

export const PackageFormModal: React.FC<PackageFormModalProps> = ({
  open,
  mode,
  template,
  initialValues,
  onClose,
  onSubmit,
}) => {
  const mergedInitialValues = useMemo(
    () => ({
      ...EMPTY_FORM_VALUES,
      ...(initialValues ?? {}),
    }),
    [initialValues]
  );
  const [values, setValues] = useState<PackageFormValues>(mergedInitialValues);

  const formatImportValue = useCallback((raw: string): string => {
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    if (!digitsOnly) return "";
    const numeric = Number(digitsOnly);
    return Number.isFinite(numeric) ? numeric.toLocaleString("vi-VN") : "";
  }, []);

  useEffect(() => {
    if (open) {
      setValues({
        ...mergedInitialValues,
        import: formatImportValue(mergedInitialValues.import),
      });
    }
  }, [open, mergedInitialValues, formatImportValue]);

  const handleChange = (
    field: keyof PackageFormValues,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    if (field === "import") {
      setValues((prev) => ({ ...prev, import: formatImportValue(value) }));
      return;
    }
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const handleSlotLinkModeChange = (mode: SlotLinkMode) => {
    setValues((prev) => ({ ...prev, slotLinkMode: mode }));
  };

  const packageDetailFields: PackageField[] = [
    "information",
    "note",
    "supplier",
    "import",
    "expired",
  ];
  const showPackageDetailsSection = packageDetailFields.some((field) =>
    template.fields.includes(field)
  );
  const showAccountStorageSection = template.fields.includes("capacity");
  const showSectionGrid =
    showPackageDetailsSection || showAccountStorageSection;
  const shouldUseTwoColumns =
    showPackageDetailsSection && showAccountStorageSection;

  return (
    <ModalShell
      open={open}
      title={`${mode === "add" ? "Thêm Gói" : "Sửa Gói"} - ${template.name}`}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-indigo-500/15 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            {mode === "add" ? "Lưu gói" : "Lưu thay đổi"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {showSectionGrid && (
          <div
            className={`grid grid-cols-1 gap-4 ${
              shouldUseTwoColumns ? "md:grid-cols-2" : ""
            }`}
          >
            {showPackageDetailsSection && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Chi tiết gói
                  </h3>
                  <p className="text-xs text-white/80">
                    Nhập các trường mô tả liên quan đến gói này.
                  </p>
                </div>
                {template.fields.includes("information") && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tài khoản
                        </label>
                        <input
                          type="text"
                          value={values.informationUser}
                          onChange={(e) => handleChange("informationUser", e)}
                          className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="tên đăng nhập"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mật khẩu
                        </label>
                        <input
                          type="text"
                          value={values.informationPass}
                          onChange={(e) => handleChange("informationPass", e)}
                          className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="mật khẩu"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mail 2FA
                      </label>
                      <input
                        type="email"
                        value={values.informationMail}
                        onChange={(e) => handleChange("informationMail", e)}
                        className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="mail@example.com"
                      />
                    </div>
                  </div>
                )}
                {template.fields.includes("note") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ghi chú
                    </label>
                    <input
                      type="text"
                      value={values.note}
                      onChange={(e) => handleChange("note", e)}
                      className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ghi chú cho gói này"
                    />
                  </div>
                )}
                {template.fields.includes("supplier") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nhà cung cấp
                    </label>
                    <input
                      type="text"
                      value={values.supplier}
                      onChange={(e) => handleChange("supplier", e)}
                      className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                {template.fields.includes("import") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giá nhập (VND)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={values.import}
                      onChange={(e) => handleChange("import", e)}
                      className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày hết hạn
                  </label>
                  <input
                    type="date"
                    value={values.expired}
                    onChange={(e) => handleChange("expired", e)}
                    className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
            {showAccountStorageSection && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Tài khoản dung lượng
                  </h3>
                  <p className="text-xs text-white/80">
                    Cung cấp thông tin tài khoản dung lượng.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tài khoản
                    </label>
                    <input
                      type="text"
                      value={values.accountUser}
                      onChange={(e) => handleChange("accountUser", e)}
                      className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="tên đăng nhập"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mật khẩu
                    </label>
                    <input
                      type="text"
                      value={values.accountPass}
                      onChange={(e) => handleChange("accountPass", e)}
                      className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="mật khẩu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mail 2FA
                    </label>
                    <input
                      type="email"
                      value={values.accountMail}
                      onChange={(e) => handleChange("accountMail", e)}
                      className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="mail@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    value={values.accountNote}
                    onChange={(e) => handleChange("accountNote", e)}
                    className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Ghi chú cho tài khoản dung lượng"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dung lượng (GB)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={values.capacity}
                    onChange={(e) => handleChange("capacity", e)}
                    placeholder={`Mặc định: ${DEFAULT_CAPACITY_LIMIT}`}
                    className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Số vị trí (slot)
          </label>
          <input
            type="number"
            min={0}
            value={values.slot}
            onChange={(e) => handleChange("slot", e)}
            placeholder={`Mặc định: ${DEFAULT_SLOT_LIMIT}`}
            className="w-full border border-white/40 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Chọn chế độ ghép lệnh
              </p>
              <p className="text-xs text-white/80">
                Chọn phương thức kết nối giữa gói và đơn hàng.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SLOT_LINK_OPTIONS.map((option) => {
              const isSelected = values.slotLinkMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSlotLinkModeChange(option.value)}
                  className={`border rounded-lg p-3 text-left transition ${
                    isSelected
                      ? "border-white/40 bg-white/10 text-white shadow-md"
                      : "border-white/20 bg-white/0 text-white/80 hover:border-white/40 hover:bg-white/5"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    {option.label}
                  </span>
                  <span className="block text-xs text-white/70 mt-1">
                    {option.helper}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-white/80 mt-2">
            <b>Link theo thông tin đơn hàng:</b> So khớp thông tin gói (tài khoản, mail, v.v.) với chi tiết trong đơn hàng.
            <br />
            <b>Link theo vị trí:</b> So khớp thông tin gói với mã vị trí (slot) khai báo trong đơn hàng.
            <br />
          </p>
        </div>
        {template.fields.length === 0 && (
          <p className="text-sm text-white/80">
            Loại gói này không có trường dữ liệu nào được cấu hình.
          </p>
        )}
      </form>
    </ModalShell>
  );
};
