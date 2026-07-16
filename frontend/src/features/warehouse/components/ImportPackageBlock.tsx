import React from "react";
import type { ImportPackageRule } from "../api/importPackageApi";

export type ImportPackageData = {
  password: string;
  backup_email: string;
  two_fa: string;
  note: string;
};

const FIELD_CONFIG: Record<
  keyof ImportPackageData,
  { label: string; type?: string; placeholder?: string }
> = {
  password: { label: "Mật khẩu", type: "password", placeholder: "Mật khẩu" },
  backup_email: { label: "Mail dự phòng", placeholder: "backup@example.com" },
  two_fa: { label: "2FA / Recovery Code", placeholder: "ABCDEF..." },
  note: { label: "Ghi chú", placeholder: "Ghi chú thêm..." },
};

const ALL_FIELDS = Object.keys(FIELD_CONFIG) as Array<keyof ImportPackageData>;

interface Props {
  rule: ImportPackageRule | null | undefined;
  data: ImportPackageData;
  onChange: (field: keyof ImportPackageData, value: string) => void;
  disabled?: boolean;
  forceShow?: boolean;
  variant?: "card" | "transparent";
}

/**
 * Khối nhập thông tin gói sản phẩm (mk, ghi chú, ...)
 * Hiển thị động khi sản phẩm có rule enabled.
 * Chỉ render fields được cấu hình trong rule.fields.
 * Lưu ý: 'account' và 'expires_at' được tự động lấy từ form Order gốc.
 */
const ImportPackageBlock: React.FC<Props> = ({
  rule,
  data,
  onChange,
  disabled = false,
  forceShow = false,
  variant = "card",
}) => {
  if (!forceShow && !rule?.enabled) return null;

  const visibleFields =
    rule?.enabled && rule.fields && rule.fields.length > 0
      ? (rule.fields as Array<keyof ImportPackageData>).filter(f => Object.keys(FIELD_CONFIG).includes(f))
      : ALL_FIELDS;

  const isCard = variant === "card";

  const containerClasses = isCard
    ? "relative mt-4 overflow-hidden rounded-[24px] border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-slate-900/60 p-5 shadow-[0_8px_32px_-12px_rgba(79,70,229,0.3)] backdrop-blur-md transition-all duration-500 hover:border-indigo-500/40 group"
    : "relative w-full h-full";

  return (
    <div className={containerClasses}>
      {/* Premium glow effects - only in card mode */}
      {isCard && (
        <>
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] group-hover:bg-indigo-400/20 transition-colors duration-700 pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px] group-hover:bg-fuchsia-400/20 transition-colors duration-700 pointer-events-none" />
        </>
      )}

      {/* Header - only in card mode */}
      {isCard && (
        <div className="relative z-10 mb-5 flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 shadow-[0_0_15px_rgba(129,140,248,0.2)]">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8] animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/95 tracking-wide">
              Thông tin dịch vụ nhập kho
            </h3>
            <p className="text-[11px] font-medium text-indigo-200/50 mt-0.5">
              Các thông tin này sẽ được lưu trực tiếp vào Tài Khoản trong Kho Hàng
            </p>
          </div>
        </div>
      )}

      <div className={`relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 ${!isCard ? "h-full content-start" : ""}`}>
        {visibleFields.map((field) => {
          const cfg = FIELD_CONFIG[field];
          if (!cfg) return null;

          const isTextarea = field === "note";
          const inputBase =
            "w-full rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-400/50 focus:bg-indigo-500/[0.05] focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";

          return (
            <div
              key={field}
              className={field === "note" ? "sm:col-span-2 lg:col-span-2" : "group/field"}
            >
              <label className="block text-[11px] font-bold text-indigo-100/60 uppercase tracking-widest mb-1.5 ml-1 transition-colors group-hover/field:text-indigo-200/80">
                {cfg.label}
              </label>
              {isTextarea ? (
                <textarea
                  className={`${inputBase} resize-none h-20 leading-relaxed`}
                  placeholder={cfg.placeholder}
                  value={data[field]}
                  onChange={(e) => onChange(field, e.target.value)}
                  disabled={disabled}
                />
              ) : (
                <input
                  type={cfg.type ?? "text"}
                  className={inputBase}
                  placeholder={cfg.placeholder}
                  value={data[field]}
                  onChange={(e) => onChange(field, e.target.value)}
                  disabled={disabled}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ImportPackageBlock;