import React, { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";

interface DateInputVNProps {
  value: string; // Định dạng ISO: YYYY-MM-DD
  onChange: (isoDate: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  focusBorderClass?: string;
}

/** Chuyển đổi 'YYYY-MM-DD' sang 'DD/MM/YYYY' */
export const formatIsoToVN = (isoStr?: string | null): string => {
  if (!isoStr || typeof isoStr !== "string") return "";
  const match = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

/** Chuyển đổi 'DD/MM/YYYY' sang 'YYYY-MM-DD', trả về null nếu ngày không hợp lệ */
export const parseVnToIso = (vnStr?: string | null): string | null => {
  if (!vnStr || typeof vnStr !== "string") return null;
  const match = vnStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null;
  }

  // Kiểm tra ngày thực tế trong tháng (ví dụ tháng 2 năm nhuận, tháng 4 có 30 ngày)
  const testDate = new Date(year, month - 1, day);
  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    return null;
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

export const DateInputVN: React.FC<DateInputVNProps> = ({
  value,
  onChange,
  className = "",
  placeholder = "DD/MM/YYYY",
  disabled = false,
  min,
  max,
  focusBorderClass = "focus:border-rose-400",
}) => {
  const [displayText, setDisplayText] = useState<string>(() => formatIsoToVN(value));
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  // Đồng bộ khi value bên ngoài thay đổi (ví dụ bấm Preset 3 tháng, 6 tháng, 1 năm)
  useEffect(() => {
    setDisplayText(formatIsoToVN(value));
  }, [value]);

  // Xử lý khi người dùng gõ phím trực tiếp
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d/]/g, "");

    // Tự động chèn dấu '/' khi người dùng gõ chuỗi số liên tục (ví dụ 16102027)
    const digitsOnly = raw.replace(/\D/g, "");
    if (digitsOnly.length > 2 && !raw.includes("/")) {
      if (digitsOnly.length <= 4) {
        raw = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
      } else {
        raw = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
      }
    }

    // Giới hạn tối đa 10 ký tự (DD/MM/YYYY)
    if (raw.length > 10) {
      raw = raw.slice(0, 10);
    }

    setDisplayText(raw);

    // Khi người dùng nhập đủ 10 ký tự dạng DD/MM/YYYY
    if (raw.length === 10) {
      const iso = parseVnToIso(raw);
      if (iso) {
        onChange(iso);
      }
    }
  };

  const handleBlur = () => {
    // Nếu blur ra ngoài mà chuỗi chưa hợp lệ, fallback về giá trị props value hiện tại
    const iso = parseVnToIso(displayText);
    if (iso) {
      onChange(iso);
      setDisplayText(formatIsoToVN(iso));
    } else {
      setDisplayText(formatIsoToVN(value));
    }
  };

  // Mở bộ chọn ngày trực quan (Native Date Picker)
  const openCalendarPicker = () => {
    if (disabled) return;
    try {
      if (hiddenDateRef.current && typeof hiddenDateRef.current.showPicker === "function") {
        hiddenDateRef.current.showPicker();
      } else {
        hiddenDateRef.current?.focus();
        hiddenDateRef.current?.click();
      }
    } catch {
      hiddenDateRef.current?.click();
    }
  };

  // Khi người dùng chọn từ popup lịch của trình duyệt
  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedIso = e.target.value;
    if (selectedIso) {
      onChange(selectedIso);
      setDisplayText(formatIsoToVN(selectedIso));
    }
  };

  return (
    <div className="relative flex items-center w-full">
      {/* Ô nhập hiển thị định dạng DD/MM/YYYY */}
      <input
        type="text"
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 pr-9 text-xs font-mono font-semibold text-white tracking-wider placeholder:text-slate-600 focus:outline-none transition-colors ${focusBorderClass} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      />

      {/* Nút bấm icon lịch mở Calendar Picker */}
      <button
        type="button"
        onClick={openCalendarPicker}
        disabled={disabled}
        tabIndex={-1}
        className="absolute right-2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
        title="Mở lịch chọn ngày"
      >
        <Calendar className="w-3.5 h-3.5 text-slate-400 hover:text-rose-400 transition-colors" />
      </button>

      {/* Input date ẩn để tận dụng bộ chọn lịch của hệ thống */}
      <input
        ref={hiddenDateRef}
        type="date"
        value={value || ""}
        min={min}
        max={max}
        onChange={handleNativePickerChange}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute bottom-0 right-0 w-0 h-0 opacity-0 pointer-events-none"
      />
    </div>
  );
};
