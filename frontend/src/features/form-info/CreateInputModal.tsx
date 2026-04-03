import { useEffect, useState } from "react";
import GradientButton from "@/components/ui/GradientButton";
import { createInput, type InputDto } from "@/lib/formsApi";

const INPUT_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "password", label: "Password" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "tel", label: "Tel" },
  { value: "url", label: "URL" },
  { value: "date", label: "Date" },
  { value: "datetime-local", label: "Date Time Local" },
  { value: "search", label: "Search" },
  { value: "textarea", label: "Textarea" },
] as const;

interface CreateInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: InputDto) => void;
}

export default function CreateInputModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateInputModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("text");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setType("text");
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên input.");
      return;
    }

    setLoading(true);
    try {
      const created = await createInput({
        name: trimmedName,
        type: type || "text",
      });
      onSuccess(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo input.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-panel-dark rounded-[32px] shadow-2xl w-full max-w-md p-8 border border-white/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-input-title"
      >
        <h3
          id="create-input-title"
          className="text-2xl font-bold text-white mb-6 tracking-tight"
        >
          Tạo input
        </h3>
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="input-name"
              className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1"
            >
              Tên input
            </label>
            <input
              id="input-name"
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-white/30"
              placeholder="Nhập tên input..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="input-type"
              className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1"
            >
              Kiểu dữ liệu
            </label>
            <select
              id="input-type"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "20px",
                paddingRight: "40px",
              }}
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={loading}
            >
              {INPUT_TYPE_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-slate-900 text-white"
                >
                  {opt.label}
                </option>
              ))}
            </select>
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
              {loading ? "Đang lưu..." : "Tạo input"}
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
  );
}
