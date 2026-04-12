import { useEffect, useState, type FormEvent } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import { apiFetch } from "@/lib/api";
import type { BankOption, Supply } from "../types";
import {
  supplyModalBackdropClass,
  supplyModalPanelClass,
  supplyModalTitleClass,
  supplyFieldLabelClass,
  supplyFieldInputClass,
  supplyModalFooterClass,
  supplyCancelBtnClass,
} from "./supplyModalUi";

type EditSupplierModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supply: Supply | null;
  banks: BankOption[];
};

export function EditSupplierModal({
  isOpen,
  onClose,
  onSuccess,
  supply,
  banks,
}: EditSupplierModalProps) {
  const [form, setForm] = useState({
    sourceName: "",
    numberBank: "",
    accountHolder: "",
    bankBin: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supply) {
      setForm({
        sourceName: supply.sourceName || "",
        numberBank: supply.numberBank || "",
        accountHolder: supply.nameBank || "",
        bankBin: supply.binBank || banks[0]?.bin || "",
      });
    }
  }, [supply, banks]);

  if (!isOpen || !supply) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/supplies/${supply.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_name: form.sourceName,
          number_bank: form.numberBank,
          account_holder: form.accountHolder.trim() || null,
          bin_bank: form.bankBin,
        }),
      });
      if (!response.ok) {
        throw new Error("Lỗi cập nhật");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className={supplyModalBackdropClass}
        onClick={onClose}
        role="presentation"
      >
        <div
          className={supplyModalPanelClass}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-labelledby="edit-supplier-title"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <h3
              id="edit-supplier-title"
              className={supplyModalTitleClass}
            >
              Chỉnh sửa thông tin
            </h3>
            <span className="hidden rounded-lg bg-indigo-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-200/90 sm:inline-block">
              NCC
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={supplyFieldLabelClass} htmlFor="edit-supply-name">
                Tên nhà cung cấp
              </label>
              <input
                id="edit-supply-name"
                className={supplyFieldInputClass}
                value={form.sourceName}
                onChange={(event) =>
                  setForm({ ...form, sourceName: event.target.value })
                }
                autoComplete="organization"
              />
            </div>
            <div>
              <label className={supplyFieldLabelClass} htmlFor="edit-supply-stk">
                Số tài khoản
              </label>
              <input
                id="edit-supply-stk"
                className={supplyFieldInputClass}
                value={form.numberBank}
                onChange={(event) =>
                  setForm({ ...form, numberBank: event.target.value })
                }
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
            <div>
              <label className={supplyFieldLabelClass} htmlFor="edit-supply-holder">
                Chủ tài khoản
              </label>
              <input
                id="edit-supply-holder"
                className={supplyFieldInputClass}
                value={form.accountHolder}
                onChange={(event) =>
                  setForm({ ...form, accountHolder: event.target.value })
                }
                placeholder="Họ tên chủ STK (hiển thị VietQR)"
                autoComplete="name"
              />
            </div>
            <div>
              <label className={supplyFieldLabelClass} htmlFor="edit-supply-bank">
                Ngân hàng
              </label>
              <select
                id="edit-supply-bank"
                className={`${supplyFieldInputClass} cursor-pointer`}
                value={form.bankBin}
                onChange={(event) =>
                  setForm({ ...form, bankBin: event.target.value })
                }
              >
                {banks.map((bank) => (
                  <option key={bank.bin} value={bank.bin}>
                    {bank.name || bank.bin}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            )}

            <div className={supplyModalFooterClass}>
              <button
                type="button"
                onClick={onClose}
                className={supplyCancelBtnClass}
              >
                Hủy
              </button>
              <GradientButton
                type="submit"
                disabled={loading}
                className="w-full min-w-[10rem] !py-2.5 !px-8 text-sm font-semibold sm:w-auto"
              >
                {loading ? "Đang lưu…" : "Lưu thay đổi"}
              </GradientButton>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
