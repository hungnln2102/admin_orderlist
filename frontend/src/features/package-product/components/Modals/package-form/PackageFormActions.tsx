import React from "react";

type PackageFormActionsProps = {
  mode: "add" | "edit";
  disabled: boolean;
  onClose: () => void;
  onSubmit: (event?: React.FormEvent) => void;
};

export function PackageFormActions({
  mode,
  disabled,
  onClose,
  onSubmit,
}: PackageFormActionsProps) {
  return (
<>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.06]"
          >
            Hủy
          </button>
          <button
            type="submit"
            onClick={onSubmit}
            disabled={disabled}
            className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mode === "add" ? "Lưu gói" : "Lưu thay đổi"}
          </button>
        </>
  );
}
