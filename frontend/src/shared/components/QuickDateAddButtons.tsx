import React from "react";
import { Plus, X } from "lucide-react";

export interface QuickDateAddButtonsProps {
  onAddDays: (days: number) => void;
  onClear?: () => void;
  hasValue?: boolean;
  size?: "xs" | "sm";
  className?: string;
}

/**
 * QuickDateAddButtons — Cụm nút tắt cộng thêm ngày (+30d, +90d, +1y, Xóa).
 * Tái sử dụng cho toàn bộ các modal quản lý hạn dùng (Kho, Đơn hàng, Gói).
 */
export const QuickDateAddButtons: React.FC<QuickDateAddButtonsProps> = ({
  onAddDays,
  onClear,
  hasValue = false,
  size = "xs",
  className = "",
}) => {
  const btnClass =
    size === "xs"
      ? "px-2 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 cursor-pointer transition-all active:scale-95"
      : "px-2.5 py-1 rounded-lg text-xs bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 cursor-pointer transition-all active:scale-95";

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      <button
        type="button"
        onClick={() => onAddDays(30)}
        className={btnClass}
        title="Thêm 30 ngày (1 tháng)"
      >
        +30 ngày
      </button>
      <button
        type="button"
        onClick={() => onAddDays(90)}
        className={btnClass}
        title="Thêm 90 ngày (3 tháng)"
      >
        +90 ngày
      </button>
      <button
        type="button"
        onClick={() => onAddDays(365)}
        className={btnClass}
        title="Thêm 365 ngày (1 năm)"
      >
        +1 năm
      </button>
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700 cursor-pointer transition-all active:scale-95"
          title="Xóa ngày hết hạn"
        >
          Xóa
        </button>
      )}
    </div>
  );
};
