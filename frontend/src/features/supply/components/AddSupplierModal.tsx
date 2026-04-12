import { useEffect, useState, type FormEvent } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import { apiFetch } from "@/lib/api";
import type { BankOption } from "../types";
import {
  supplyModalBackdropClass,
  supplyModalPanelClass,
  supplyModalTitleClass,
  supplyFieldLabelClass,
  supplyFieldInputClass,
  supplyModalFooterClass,
  supplyCancelBtnClass,
} from "./supplyModalUi";

type AddSupplierModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  banks: BankOption[];
};

export function AddSupplierModal({
  isOpen,
  onClose,
  onSuccess,
  banks,
}: AddSupplierModalProps) {
  const [form, setForm] = useState({
    sourceName: "",
    numberBank: "",
    accountHolder: "",
    bankBin: "",
    status: "active",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && banks.length > 0 && !form.bankBin) {
      setForm((prev) => ({ ...prev, bankBin: banks[0].bin }));
    }
  }, [isOpen, banks, form.bankBin]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.sourceName.trim()) {
      setError("Tên không được để trống");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/api/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_name: form.sourceName,
          number_bank: form.numberBank,
          account_holder: form.accountHolder.trim() || null,
          bin_bank: form.bankBin,
          status: form.status,
        }),
      });
      if (!response.ok) {
        throw new Error((await response.json()).error || "Lỗi khi tạo");
      }

      onSuccess();
      onClose();
      setForm({
        sourceName: "",
        numberBank: "",
        accountHolder: "",
        bankBin: banks[0]?.bin || "",
        status: "active",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo nhà cung cấp");
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
          aria-labelledby="add-supplier-title"
        >
          <h3
            id="add-supplier-title"
            className={`${supplyModalTitleClass} mb-6`}
          >
            Thêm nhà cung cấp mới
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={supplyFieldLabelClass} htmlFor="add-supply-name">
                Tên nhà cung cấp
              </label>
              <input
                id="add-supply-name"
                className={supplyFieldInputClass}
                value={form.sourceName}
                onChange={(event) =>
                  setForm({ ...form, sourceName: event.target.value })
                }
                placeholder="Nhập tên…"
                autoComplete="organization"
              />
            </div>
            <div>
              <label className={supplyFieldLabelClass} htmlFor="add-supply-stk">
                Số tài khoản
              </label>
              <input
                id="add-supply-stk"
                className={supplyFieldInputClass}
                value={form.numberBank}
                onChange={(event) =>
                  setForm({ ...form, numberBank: event.target.value })
                }
                placeholder="STK…"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={supplyFieldLabelClass} htmlFor="add-supply-holder">
                Chủ tài khoản
              </label>
              <input
                id="add-supply-holder"
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
              <label className={supplyFieldLabelClass} htmlFor="add-supply-bank">
                Ngân hàng
              </label>
              <select
                id="add-supply-bank"
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
                {loading ? "Đang xử lý…" : "Thêm mới"}
              </GradientButton>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
