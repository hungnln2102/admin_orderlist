import { useEffect, useState, type FormEvent } from "react";
import GradientButton from "../../../../components/ui/GradientButton";
import { apiFetch } from "../../../../lib/api";
import type { BankOption, Supply } from "../types";

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
    bankBin: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supply) {
      setForm({
        sourceName: supply.sourceName || "",
        numberBank: supply.numberBank || "",
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
    try {
      const response = await apiFetch(`/api/supplies/${supply.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_name: form.sourceName,
          number_bank: form.numberBank,
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
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="glass-panel-dark rounded-[32px] shadow-2xl w-full max-w-lg p-8 border border-white/10 animate-in zoom-in-95 duration-300"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-2xl font-bold text-white mb-6 tracking-tight">
          Chỉnh Sửa Thông Tin
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tên Nhà Cung Cấp
            </label>
            <input
              className="w-full border rounded-lg p-2 mt-1"
              value={form.sourceName}
              onChange={(event) =>
                setForm({ ...form, sourceName: event.target.value })
              }
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
          {error && <p className="text-sm text-red-500">{error}</p>}
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
              Lưu Thay Đổi
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
  );
}
