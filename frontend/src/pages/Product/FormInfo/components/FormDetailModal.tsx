import { ModalShell } from "../../PackageProduct/components/Modals/ModalShell";
import type { FormDetailView } from "../types";

interface FormDetailModalProps {
  open: boolean;
  data: FormDetailView | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function FormDetailModal({
  open,
  data,
  loading,
  error,
  onClose,
}: FormDetailModalProps) {
  return (
    <ModalShell
      open={open}
      title={
        data
          ? `Chi tiết form: ${data.name || "Không có tên"}`
          : "Đang tải chi tiết form..."
      }
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          Đóng
        </button>
      }
    >
      <div className="space-y-4 rounded-lg bg-slate-800/95 px-1 py-1 text-white">
        {error && (
          <div className="px-3 py-2 rounded-md bg-red-500/20 border border-red-400/50 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white">
            {data?.name || "Đang tải..."}
          </h3>
          <p className="text-sm text-white/80">
            {data?.description || "Không có mô tả"}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-white">Các khối input</h4>
          {loading && (
            <p className="text-sm text-white/70">
              Đang tải danh sách khối input...
            </p>
          )}
          {!loading && data && data.inputs.length === 0 && (
            <p className="text-sm text-white/70">
              Form này chưa có khối input nào.
            </p>
          )}
          {!loading && data && data.inputs.length > 0 && (
            <ul className="space-y-1">
              {data.inputs.map((input) => (
                <li
                  key={input.id}
                  className="flex items-center justify-between rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-white">
                    {input.name || "Chưa đặt tên"}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-white/70">
                    {input.type || "text"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

