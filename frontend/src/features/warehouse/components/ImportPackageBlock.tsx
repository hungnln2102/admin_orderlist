import React from "react";
import type { ImportPackageRule } from "../api/importPackageApi";

export type ImportPackageData = {
  account: string;
  password: string;
  backup_email: string;
  two_fa: string;
  expires_at: string;
  note: string;
};

const FIELD_CONFIG: Record<
  keyof ImportPackageData,
  { label: string; type?: string; placeholder?: string }
> = {
  account: { label: "Tai khoan / Email", placeholder: "Email / Username" },
  password: { label: "Mat khau", type: "password", placeholder: "Mat khau" },
  backup_email: { label: "Mail du phong", placeholder: "backup@example.com" },
  two_fa: { label: "2FA / Recovery Code", placeholder: "ABCDEF..." },
  expires_at: { label: "Han su dung", type: "date" },
  note: { label: "Ghi chu", placeholder: "Ghi chu them..." },
};

const ALL_FIELDS = Object.keys(FIELD_CONFIG) as Array<keyof ImportPackageData>;

interface Props {
  rule: ImportPackageRule | null | undefined;
  data: ImportPackageData;
  onChange: (field: keyof ImportPackageData, value: string) => void;
  disabled?: boolean;
}

/**
 * Khoi nhap thong tin goi san pham (account, mk, han su dung, ...)
 * Hien thi dong khi san pham co rule enabled.
 * Chi render fields duoc cau hinh trong rule.fields.
 */
const ImportPackageBlock: React.FC<Props> = ({
  rule,
  data,
  onChange,
  disabled = false,
}) => {
  if (!rule?.enabled) return null;

  const visibleFields =
    rule.fields.length > 0
      ? (rule.fields as Array<keyof ImportPackageData>)
      : ALL_FIELDS;

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/30 backdrop-blur-sm p-4 space-y-3 mt-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-300/80">
          Thong tin tao goi
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibleFields.map((field) => {
          const cfg = FIELD_CONFIG[field];
          if (!cfg) return null;

          const isTextarea = field === "note";
          const inputBase =
            "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/40 transition disabled:opacity-50 disabled:cursor-not-allowed";

          return (
            <div
              key={field}
              className={field === "note" ? "sm:col-span-2" : ""}
            >
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">
                {cfg.label}
              </label>
              {isTextarea ? (
                <textarea
                  className={`${inputBase} resize-none h-16`}
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
