import { useEffect, useMemo, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import { useBankList } from "@/shared/hooks/useBankList";
import type { ShopBankAccountItem, ShopBankAccountPayload } from "../types";
import {
  bankFieldsFromSelection,
  orphanBankOption,
} from "../utils/applyBankSelection";

type ShopBankAccountFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  item?: ShopBankAccountItem | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: ShopBankAccountPayload) => Promise<void> | void;
};

const emptyForm = {
  label: "",
  accountNumber: "",
  accountHolder: "",
  bankBin: "",
  bankShortCode: "",
  bankDisplayName: "",
  qrNotePrefix: "",
  isDefault: false,
  isActive: true,
};

export function ShopBankAccountFormModal({
  isOpen,
  mode,
  item,
  submitting = false,
  onClose,
  onSubmit,
}: ShopBankAccountFormModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const { banks, loading: banksLoading, error: banksError } = useBankList();

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      item
        ? {
            label: item.label ?? "",
            accountNumber: item.accountNumber,
            accountHolder: item.accountHolder,
            bankBin: item.bankBin,
            bankShortCode: item.bankShortCode ?? "",
            bankDisplayName: item.bankDisplayName ?? "",
            qrNotePrefix: item.qrNotePrefix ?? "",
            isDefault: item.isDefault,
            isActive: item.isActive,
          }
        : emptyForm
    );
    setError(null);
  }, [isOpen, item]);

  const bankOptions = useMemo(() => {
    const list = [...banks];
    const orphan = orphanBankOption({
      bankBin: form.bankBin,
      bankShortCode: form.bankShortCode,
      bankDisplayName: form.bankDisplayName,
    });
    if (orphan && !list.some((b) => b.bin === orphan.bin)) {
      list.unshift(orphan);
    }
    return list;
  }, [banks, form.bankBin, form.bankShortCode, form.bankDisplayName]);

  useEffect(() => {
    if (!isOpen || mode !== "create" || item || banksLoading) return;
    if (form.bankBin || bankOptions.length === 0) return;
    setForm((f) => ({ ...f, ...bankFieldsFromSelection(bankOptions[0]) }));
  }, [isOpen, mode, item, banksLoading, bankOptions, form.bankBin]);

  if (!isOpen) return null;

  const title = mode === "create" ? "Thêm STK nhận tiền" : "Cập nhật STK";
  const submitLabel = mode === "create" ? "Tạo mới" : "Lưu thay đổi";

  const handleBankChange = (bin: string) => {
    const bank = bankOptions.find((b) => b.bin === bin);
    if (!bank) {
      setForm((f) => ({
        ...f,
        bankBin: "",
        bankShortCode: "",
        bankDisplayName: "",
      }));
      return;
    }
    setForm((f) => ({ ...f, ...bankFieldsFromSelection(bank) }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const accountNumber = form.accountNumber.trim();
    const accountHolder = form.accountHolder.trim();
    const bankBin = form.bankBin.trim().replace(/\D/g, "");
    if (!accountNumber || !accountHolder || !bankBin) {
      setError("STK, tên chủ TK và ngân hàng là bắt buộc.");
      return;
    }
    if (!/^\d{6}$/.test(bankBin)) {
      setError("Mã BIN ngân hàng không hợp lệ — hãy chọn lại từ danh sách.");
      return;
    }
    setError(null);
    await onSubmit({
      label: form.label.trim() || null,
      accountNumber,
      accountHolder,
      bankBin,
      bankShortCode: form.bankShortCode.trim() || null,
      bankDisplayName: form.bankDisplayName.trim() || null,
      qrNotePrefix:
        mode === "edit" ? (item?.qrNotePrefix?.trim() || null) : null,
      isDefault: form.isDefault,
      isActive: form.isActive,
    });
  };

  const selectedBank = bankOptions.find((b) => b.bin === form.bankBin);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(2,6,23,0.98))] p-7 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-2 text-sm text-white/55">
            STK mặc định dùng cho VietQR đơn hàng, Telegram và biên lai.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-indigo-200/55">
                Nhãn gợi nhớ
              </label>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white"
                placeholder="VD: VPBank chính"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-indigo-200/55">
                Số tài khoản *
              </label>
              <input
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-indigo-200/55">
                Tên chủ TK *
              </label>
              <input
                value={form.accountHolder}
                onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="shop-bank-select"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-indigo-200/55"
              >
                Ngân hàng *
              </label>
              <select
                id="shop-bank-select"
                value={form.bankBin}
                onChange={(e) => handleBankChange(e.target.value)}
                disabled={banksLoading || bankOptions.length === 0}
                className="w-full cursor-pointer rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white"
                required
              >
                <option value="">
                  {banksLoading ? "Đang tải danh sách..." : "— Chọn ngân hàng —"}
                </option>
                {bankOptions.map((bank) => (
                  <option key={bank.bin} value={bank.bin}>
                    {bank.name} · BIN {bank.bin}
                    {bank.code ? ` · ${bank.code}` : ""}
                  </option>
                ))}
              </select>
              {banksError && (
                <p className="mt-2 text-xs text-amber-300/90">
                  {banksError}. Kiểm tra kết nối hoặc thử tải lại trang.
                </p>
              )}
              {selectedBank && (
                <p className="mt-2 text-xs text-white/45">
                  VietQR: <span className="font-mono text-white/70">{selectedBank.code || "—"}</span>
                  {" · "}
                  Hiển thị: {selectedBank.fullName || selectedBank.name}
                </p>
              )}
              <p className="mt-2 text-xs text-white/40">
                Nội dung chuyển khoản trên QR chỉ cần mã giao dịch 8 ký tự của đơn — không cần thêm
                prefix.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Đang bật
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              Đặt làm STK mặc định
            </label>

            {error && (
              <div className="sm:col-span-2 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="text-sm text-white/50 hover:text-white">
                Hủy
              </button>
              <GradientButton type="submit" disabled={submitting || banksLoading} className="!rounded-2xl">
                {submitting ? "Đang lưu..." : submitLabel}
              </GradientButton>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
