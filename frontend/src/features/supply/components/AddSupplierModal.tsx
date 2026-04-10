import { useEffect, useState, type FormEvent } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import { apiFetch } from "@/lib/api";
import type { BankOption } from "../types";

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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="glass-panel-dark rounded-[32px] shadow-2xl w-full max-w-md p-8 border border-white/10 animate-in zoom-in-95 duration-300"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-2xl font-bold text-white mb-6 tracking-tight">
          Thêm Nhà Cung Cấp Mới
        </h3>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1">
              Tên Nhà Cung Cấp
            </label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-white/20"
              value={form.sourceName}
              onChange={(event) =>
                setForm({ ...form, sourceName: event.target.value })
              }
              placeholder="Nhập tên..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Số Tài Khoản
            </label>
            <input
              className="w-full border rounded-lg p-2 mt-1"
              value={form.numberBank}
              onChange={(event) =>
                setForm({ ...form, numberBank: event.target.value })
              }
              placeholder="STK..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Ngân Hàng
            </label>
            <select
              className="w-full border rounded-lg p-2 mt-1"
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
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-white/40 hover:text-white transition-colors"
            >
              Hủy
            </button>
            <GradientButton
              type="submit"
              disabled={loading}
              className="!py-2.5 !px-8 text-sm"
            >
              {loading ? "Đang xử lý..." : "Thêm Mới"}
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
