import { useEffect, useState } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import GradientButton from "@/components/ui/GradientButton";
import { createForm, type InputDto, type CreateFormResponse } from "@/lib/formsApi";

interface CreateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: CreateFormResponse & { name: string; description: string }) => void;
  inputItems: InputDto[];
}

export default function CreateFormModal({
  isOpen,
  onClose,
  onSuccess,
  inputItems,
}: CreateFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setSelectedIds(new Set());
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const toggleInput = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === inputItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(inputItems.map((i) => i.id)));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên form.");
      return;
    }

    setLoading(true);
    try {
      const created = await createForm({
        name: trimmedName,
        description: description.trim() || undefined,
        inputIds: Array.from(selectedIds),
      });
      onSuccess({
        ...created,
        name: created.name ?? trimmedName,
        description: created.description ?? "",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo form.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-panel-dark rounded-[32px] shadow-2xl w-full max-w-lg p-8 border border-white/10 my-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-form-title"
      >
        <h3
          id="create-form-title"
          className="text-2xl font-bold text-white mb-6 tracking-tight"
        >
          Tạo form
        </h3>
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="form-name"
              className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1"
            >
              Tên form
            </label>
            <input
              id="form-name"
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-white/30"
              placeholder="Nhập tên form..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="form-description"
              className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1"
            >
              Mô tả form
            </label>
            <textarea
              id="form-description"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-white/30 resize-none"
              placeholder="Nhập mô tả (tùy chọn)..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 ml-1">
                Chọn input (nhiều lựa chọn)
              </label>
              {inputItems.length > 0 && (
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {selectedIds.size === inputItems.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
              {inputItems.length === 0 ? (
                <p className="text-sm text-white/50 py-2">Chưa có input nào. Tạo input trước.</p>
              ) : (
                inputItems.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                        isChecked ? "bg-indigo-500/20 border border-indigo-500/40" : "hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isChecked ? "border-indigo-400 bg-indigo-500/30" : "border-white/30"
                        }`}
                      >
                        {isChecked && <CheckIcon className="w-3 h-3 text-indigo-400" />}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isChecked}
                        onChange={() => toggleInput(item.id)}
                        disabled={loading}
                      />
                      <span className="font-medium text-white">{item.name || "Chưa đặt tên"}</span>
                      <span className="text-xs uppercase tracking-wide text-white/50">
                        {item.type || "text"}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-white/40 hover:text-white transition-colors"
              disabled={loading}
            >
              Hủy
            </button>
            <GradientButton type="submit" disabled={loading} className="!py-2.5 !px-8 text-sm">
              {loading ? "Đang lưu..." : "Tạo form"}
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
  );
}
