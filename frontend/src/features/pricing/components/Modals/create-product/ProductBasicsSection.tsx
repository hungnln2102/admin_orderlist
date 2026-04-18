import { PlusIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import type { CreateProductFormState } from "../../../types";
import { inputBase, labelBase } from "./shared";

type ProductBasicsSectionProps = {
  createForm: CreateProductFormState;
  productNameOptions: string[];
  productPackageOptionsByName: Record<string, string[]>;
  onFormChange: (field: keyof CreateProductFormState, value: string) => void;
};

const buildNextLabel = (baseLabel: string, usedLabels: string[]) => {
  const used = new Set(
    usedLabels
      .map((label) => String(label || "").trim().toLowerCase())
      .filter(Boolean)
  );
  if (!used.has(baseLabel.toLowerCase())) return baseLabel;
  let suffix = 2;
  while (used.has(`${baseLabel} ${suffix}`.toLowerCase())) {
    suffix += 1;
  }
  return `${baseLabel} ${suffix}`;
};

export function ProductBasicsSection({
  createForm,
  productNameOptions,
  productPackageOptionsByName,
  onFormChange,
}: ProductBasicsSectionProps) {
  const [isCustomProductName, setIsCustomProductName] = useState(false);
  const [isCustomPackage, setIsCustomPackage] = useState(false);

  const availableProductNameOptions = useMemo(() => {
    const seen = new Set<string>();
    return productNameOptions
      .map((name) => String(name || "").trim())
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) =>
        left.localeCompare(right, "vi", { sensitivity: "base" })
      );
  }, [productNameOptions]);

  const dropdownProductNameOptions = useMemo(() => {
    const currentName = createForm.packageName.trim();
    if (!currentName) return availableProductNameOptions;
    const exists = availableProductNameOptions.some(
      (option) => option.toLowerCase() === currentName.toLowerCase()
    );
    return exists
      ? availableProductNameOptions
      : [currentName, ...availableProductNameOptions];
  }, [availableProductNameOptions, createForm.packageName]);

  const availablePackageOptions = useMemo(() => {
    const currentProductName = createForm.packageName.trim().toLowerCase();
    if (!currentProductName) return [] as string[];
    const matchedEntry = Object.entries(productPackageOptionsByName).find(
      ([productName]) => productName.trim().toLowerCase() === currentProductName
    );
    const options = matchedEntry?.[1] ?? [];
    const seen = new Set<string>();
    return options
      .map((name) => String(name || "").trim())
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) =>
        left.localeCompare(right, "vi", { sensitivity: "base" })
      );
  }, [createForm.packageName, productPackageOptionsByName]);

  const dropdownPackageOptions = useMemo(() => {
    const currentPackage = createForm.packageProduct.trim();
    if (!currentPackage) return availablePackageOptions;
    const exists = availablePackageOptions.some(
      (option) => option.toLowerCase() === currentPackage.toLowerCase()
    );
    return exists ? availablePackageOptions : [currentPackage, ...availablePackageOptions];
  }, [availablePackageOptions, createForm.packageProduct]);

  useEffect(() => {
    const currentName = createForm.packageName.trim();
    if (!currentName) {
      setIsCustomProductName(false);
      return;
    }
    const exists = availableProductNameOptions.some(
      (option) => option.toLowerCase() === currentName.toLowerCase()
    );
    setIsCustomProductName(!exists);
  }, [createForm.packageName, availableProductNameOptions]);

  useEffect(() => {
    const currentPackage = createForm.packageProduct.trim();
    if (!currentPackage) {
      setIsCustomPackage(false);
      return;
    }
    const exists = availablePackageOptions.some(
      (option) => option.toLowerCase() === currentPackage.toLowerCase()
    );
    setIsCustomPackage(!exists);
  }, [createForm.packageProduct, availablePackageOptions]);

  const handleUseDropdownProductName = () => {
    const fallbackName = availableProductNameOptions[0] ?? "";
    setIsCustomProductName(false);
    if (!fallbackName) {
      onFormChange("packageName", "");
      return;
    }
    if (fallbackName.toLowerCase() !== createForm.packageName.trim().toLowerCase()) {
      onFormChange("packageName", fallbackName);
    }
  };

  const handleProductNameSelectChange = (nextProductName: string) => {
    onFormChange("packageName", nextProductName);
    if (isCustomPackage) return;
    const nextPackages = Object.entries(productPackageOptionsByName).find(
      ([productName]) =>
        productName.trim().toLowerCase() === nextProductName.trim().toLowerCase()
    )?.[1];
    const fallbackPackage =
      (nextPackages || [])
        .map((name) => String(name || "").trim())
        .find(Boolean) || "";
    onFormChange("packageProduct", fallbackPackage);
  };

  const handleCreateNewProduct = () => {
    const nextProductName = buildNextLabel("Sản phẩm mới", [
      ...availableProductNameOptions,
      createForm.packageName,
    ]);
    const nextPackageName = buildNextLabel("Gói sản phẩm mới", [
      createForm.packageProduct,
    ]);
    setIsCustomProductName(true);
    setIsCustomPackage(true);
    onFormChange("packageName", nextProductName);
    onFormChange("packageProduct", nextPackageName);
  };

  const handleCreateNewPackage = () => {
    const nextPackageName = buildNextLabel("Gói sản phẩm mới", [
      ...availablePackageOptions,
      createForm.packageProduct,
    ]);
    setIsCustomProductName(false);
    setIsCustomPackage(true);
    if (availableProductNameOptions.length > 0) {
      const current = createForm.packageName.trim();
      const hasCurrentInDropdown = availableProductNameOptions.some(
        (option) => option.toLowerCase() === current.toLowerCase()
      );
      if (!hasCurrentInDropdown) {
        onFormChange("packageName", availableProductNameOptions[0]);
      }
    }
    onFormChange("packageProduct", nextPackageName);
  };

  const handleUseDropdownPackage = () => {
    const fallbackPackage = availablePackageOptions[0] ?? "";
    setIsCustomPackage(false);
    onFormChange("packageProduct", fallbackPackage);
  };

  return (
    <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-5 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300 mb-4">
        Thông Tin Cơ Bản
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className={labelBase}>Tên Sản Phẩm</label>
            {isCustomProductName ? (
              <button
                type="button"
                onClick={handleUseDropdownProductName}
                className="inline-flex items-center rounded-lg border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-400/20"
              >
                Chọn sẵn
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateNewProduct}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
                title="Tạo sản phẩm mới"
                aria-label="Tạo sản phẩm mới"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Mới
              </button>
            )}
          </div>
          {isCustomProductName ? (
            <input
              type="text"
              className={inputBase}
              placeholder="Nhập tên sản phẩm mới"
              value={createForm.packageName}
              onChange={(event) => onFormChange("packageName", event.target.value)}
            />
          ) : (
            <select
              className={inputBase}
              value={createForm.packageName}
              onChange={(event) =>
                handleProductNameSelectChange(event.target.value)
              }
            >
              <option value="" className="bg-slate-900 text-white">
                Chọn sản phẩm có sẵn
              </option>
              {dropdownProductNameOptions
                .filter((option) => option.trim().length > 0)
                .map((option) => (
                  <option
                    key={option}
                    value={option}
                    className="bg-slate-900 text-white"
                  >
                    {option}
                  </option>
                ))}
            </select>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className={labelBase}>Gói Sản Phẩm</label>
            {isCustomPackage ? (
              <button
                type="button"
                onClick={handleUseDropdownPackage}
                className="inline-flex items-center rounded-lg border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-400/20"
              >
                Chọn sẵn
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateNewPackage}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
                title="Tạo gói sản phẩm mới"
                aria-label="Tạo gói sản phẩm mới"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Mới
              </button>
            )}
          </div>
          {isCustomPackage ? (
            <input
              type="text"
              className={inputBase}
              placeholder="Nhập gói sản phẩm mới"
              value={createForm.packageProduct}
              onChange={(event) =>
                onFormChange("packageProduct", event.target.value)
              }
            />
          ) : (
            <select
              className={inputBase}
              value={createForm.packageProduct}
              onChange={(event) =>
                onFormChange("packageProduct", event.target.value)
              }
            >
              <option value="" className="bg-slate-900 text-white">
                Chọn gói theo sản phẩm
              </option>
              {dropdownPackageOptions
                .filter((option) => option.trim().length > 0)
                .map((option) => (
                  <option
                    key={option}
                    value={option}
                    className="bg-slate-900 text-white"
                  >
                    {option}
                  </option>
                ))}
            </select>
          )}
        </div>
        <div className="md:col-span-2">
          <label className={labelBase}>Mã Sản Phẩm</label>
          <input
            type="text"
            className={inputBase}
            placeholder="Nhập mã sản phẩm"
            value={createForm.sanPham}
            onChange={(event) => onFormChange("sanPham", event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
