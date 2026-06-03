import React from "react";
import SearchableSelect from "@/components/modals/CreateOrderModal/SearchableSelect";
import type { ProductOption } from "../hooks/useWarehouseProducts";

type Props = {
  value: string;
  options: ProductOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export const ProductCategorySelect: React.FC<Props> = ({
  value,
  options,
  onChange,
  disabled,
  placeholder = "-- Chọn sản phẩm --",
}) => (
  <SearchableSelect
    name="warehouse_category"
    value={value}
    options={options}
    placeholder={placeholder}
    disabled={disabled}
    onChange={(v) => onChange(String(v))}
    onClear={() => onChange("")}
  />
);
