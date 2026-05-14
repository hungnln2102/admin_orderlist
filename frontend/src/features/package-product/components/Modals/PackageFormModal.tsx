import React from "react";
import type {
  AccountInfo,
  PackageFormValues,
  PackageTemplate,
} from "../../utils/packageHelpers";
import {
  DEFAULT_SLOT_LIMIT,
  SLOT_LINK_OPTIONS,
} from "../../utils/packageHelpers";
import { ModalShell } from "./ModalShell";
import { StockDropdown } from "./package-form/StockDropdown";
import { inputCls, labelCls } from "./package-form/shared";
import { usePackageFormState } from "./package-form/usePackageFormState";

export type PackageFormModalProps = {
  open: boolean;
  mode: "add" | "edit";
  template: PackageTemplate;
  initialValues?: PackageFormValues;
  hasStorage: boolean;
  stockInfo?: AccountInfo | null;
  storageInfo?: AccountInfo | null;
  onClose: () => void;
  onSubmit: (values: PackageFormValues) => void;
};

export const PackageFormModal: React.FC<PackageFormModalProps> = ({
  open,
  mode,
  template,
  initialValues,
  hasStorage,
  stockInfo,
  storageInfo,
  onClose,
  onSubmit,
}) => {
  const {
    values,
    setValues,
    warehouseLoading,
    inStockItemsCount,
    stockDropdownOpen,
    setStockDropdownOpen,
    stockSearch,
    setStockSearch,
    stockManual,
    stockRef,
    storageDropdownOpen,
    setStorageDropdownOpen,
    storageSearch,
    setStorageSearch,
    storageManual,
    storageRef,
    filteredStockItems,
    filteredStorageItems,
    selectedStockItem,
    selectedStorageItem,
    handleUpdateWarehouseInfo,
    handleChange,
    handleSelectStock,
    handleClearStock,
    handleToggleStockManual,
    handleSelectStorage,
    handleClearStorage,
    handleToggleStorageManual,
    matchRequiresAccountError,
    matchRequiresActivationError,
    handleSubmit,
    handleSlotLinkModeChange,
  } = usePackageFormState({
    open,
    initialValues,
    onSubmit,
    requireActivationForInformation: hasStorage,
  });

  const showSupplierBlock = template.fields.includes("supplier");
  const showImport = template.fields.includes("import");

  return (
    <ModalShell
      open={open}
      title={`${mode === "add" ? "Thêm Gói" : "Sửa Gói"} — ${template.name}`}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.06]"
          >
            Hủy
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={Boolean(
              matchRequiresAccountError || matchRequiresActivationError
            )}
            className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mode === "add" ? "Lưu gói" : "Lưu thay đổi"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {(showSupplierBlock || hasStorage) && (
          <div
            className={`grid grid-cols-1 gap-5 ${
              showSupplierBlock && hasStorage ? "lg:grid-cols-2" : ""
            }`}
          >
            {showSupplierBlock && (
              <div className="space-y-4 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.02] p-4">
                <div className="mb-1 flex items-center gap-2">
                  <div className="h-5 w-1 rounded-full bg-indigo-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Tài khoản gốc
                    </h3>
                    <p className="text-[11px] text-white/30">
                      Tài khoản chính của gói sản phẩm
                    </p>
                  </div>
                </div>
                <StockDropdown
                  label="Chọn tài khoản"
                  placeholder="Chọn tài khoản gốc từ kho..."
                  filteredItems={filteredStockItems}
                  totalCount={inStockItemsCount}
                  loading={warehouseLoading}
                  selectedId={values.stockId}
                  selectedItem={selectedStockItem}
                  search={stockSearch}
                  onSearchChange={setStockSearch}
                  isOpen={stockDropdownOpen}
                  onToggle={() => {
                    setStockDropdownOpen((prev) => !prev);
                    setStorageDropdownOpen(false);
                  }}
                  onSelect={handleSelectStock}
                  onClear={handleClearStock}
                  dropdownRef={stockRef}
                  manualMode={stockManual}
                  onToggleManual={handleToggleStockManual}
                  manualEntry={values.manualStock}
                  onManualEntryChange={(entry) =>
                    setValues((prev) => ({
                      ...prev,
                      manualStock: entry,
                    }))
                  }
                  readOnly={mode === "edit"}
                  fallbackInfo={stockInfo}
                  onUpdateSelected={handleUpdateWarehouseInfo}
                />
                <div>
                  <label className={labelCls}>Nhà cung cấp (NCC)</label>
                  <input
                    type="text"
                    value={values.supplier}
                    onChange={(event) => handleChange("supplier", event)}
                    placeholder="Tên nhà cung cấp..."
                    className={inputCls}
                  />
                </div>
                {showImport && (
                  <div>
                    <label className={labelCls}>Giá nhập (VND)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={values.import}
                      onChange={(event) => handleChange("import", event)}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            )}

            {hasStorage && (
              <div className="space-y-4 rounded-xl border border-violet-500/15 bg-violet-500/[0.02] p-4">
                <div className="mb-1 flex items-center gap-2">
                  <div className="h-5 w-1 rounded-full bg-violet-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Tài khoản kích hoạt
                    </h3>
                    <p className="text-[11px] text-white/30">
                      Tài khoản dùng để kích hoạt cho khách
                    </p>
                  </div>
                </div>
                <StockDropdown
                  label="Chọn tài khoản"
                  placeholder="Chọn tài khoản kích hoạt từ kho..."
                  filteredItems={filteredStorageItems}
                  totalCount={inStockItemsCount}
                  loading={warehouseLoading}
                  selectedId={values.storageId}
                  selectedItem={selectedStorageItem}
                  search={storageSearch}
                  onSearchChange={setStorageSearch}
                  isOpen={storageDropdownOpen}
                  onToggle={() => {
                    setStorageDropdownOpen((prev) => !prev);
                    setStockDropdownOpen(false);
                  }}
                  onSelect={handleSelectStorage}
                  onClear={handleClearStorage}
                  dropdownRef={storageRef}
                  manualMode={storageManual}
                  onToggleManual={handleToggleStorageManual}
                  manualEntry={values.manualStorage}
                  onManualEntryChange={(entry) =>
                    setValues((prev) => ({
                      ...prev,
                      manualStorage: entry,
                    }))
                  }
                  readOnly={mode === "edit"}
                  fallbackInfo={storageInfo}
                  onUpdateSelected={handleUpdateWarehouseInfo}
                />
                <div>
                  <label className={labelCls}>Dung lượng (GB)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={values.storageTotal}
                    onChange={(event) => {
                      const sanitized = event.target.value.replace(/[^0-9]/g, "");
                      setValues((prev) => ({
                        ...prev,
                        storageTotal: sanitized,
                      }));
                    }}
                    placeholder="Ví dụ: 100, 200, 2000..."
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {!showSupplierBlock && !hasStorage && showImport && (
          <div className="space-y-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-indigo-500" />
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Chi tiết gói
                </h3>
                <p className="text-[11px] text-white/30">
                  Thông tin mô tả gói sản phẩm
                </p>
              </div>
            </div>
            <div>
              <label className={labelCls}>Giá nhập (VND)</label>
              <input
                type="text"
                inputMode="numeric"
                value={values.import}
                onChange={(event) => handleChange("import", event)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        <div className="space-y-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-1 flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-emerald-500" />
            <div>
              <h3 className="text-sm font-semibold text-white">Cấu hình gói</h3>
              <p className="text-[11px] text-white/30">
                Thiết lập slot và chế độ ghép lệnh
              </p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Số vị trí (slot)</label>
            <input
              type="number"
              min={0}
              value={values.slot}
              onChange={(event) => handleChange("slot", event)}
              placeholder={`Mặc định: ${DEFAULT_SLOT_LIMIT}`}
              className={inputCls}
            />
          </div>

          <div>
            <div className="mb-3">
              <p className="text-sm font-semibold text-white">
                Chế độ ghép lệnh
              </p>
              <p className="text-[11px] text-white/30">
                Chọn phương thức kết nối giữa gói và đơn hàng.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SLOT_LINK_OPTIONS.map((option) => {
                const isSelected = values.slotLinkMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSlotLinkModeChange(option.value)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-indigo-500/40 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-white">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-[11px] text-white/40">
                      {option.helper}
                    </span>
                  </button>
                );
              })}
            </div>
            {matchRequiresAccountError && (
              <p
                className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400"
                role="alert"
              >
                {matchRequiresAccountError}
              </p>
            )}
            {matchRequiresActivationError && (
              <p
                className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400"
                role="alert"
              >
                {matchRequiresActivationError}
              </p>
            )}
          </div>
        </div>

        {template.fields.length === 0 && !hasStorage && (
          <p className="text-sm text-white/40">
            Loại gói này không có trường dữ liệu nào được cấu hình.
          </p>
        )}
      </form>
    </ModalShell>
  );
};
