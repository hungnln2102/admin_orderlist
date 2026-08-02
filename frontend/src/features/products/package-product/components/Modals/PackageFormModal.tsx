import React from "react";
import type {
  AccountInfo,
  PackageFormValues,
  PackageTemplate,
} from "../../utils/packageHelpers";
import {
} from "../../utils/packageHelpers";
import { ModalShell } from "./ModalShell";
import { StockDropdown } from "./package-form/StockDropdown";
import { inputCls, labelCls } from "./package-form/shared";
import { PackageFormActions } from "./package-form/PackageFormActions";
import { PackageFormSlotConfig } from "./package-form/PackageFormSlotConfig";
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
        <PackageFormActions
          mode={mode}
          disabled={Boolean(matchRequiresAccountError || matchRequiresActivationError)}
          onClose={onClose}
          onSubmit={handleSubmit}
        />
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

        <PackageFormSlotConfig
          values={values}
          matchRequiresAccountError={matchRequiresAccountError}
          matchRequiresActivationError={matchRequiresActivationError}
          onChange={handleChange}
          onSlotLinkModeChange={handleSlotLinkModeChange}
        />

        {template.fields.length === 0 && !hasStorage && (
          <p className="text-sm text-white/40">
            Loại gói này không có trường dữ liệu nào được cấu hình.
          </p>
        )}
      </form>
    </ModalShell>
  );
};
