import { useEffect, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import {
  fetchFormDetail,
  updateForm,
  type CreateFormResponse,
  type InputDto,
} from "@/lib/formsApi";
import type { FormInfoItem } from "./types";
import { FormInputSelectSection } from "./components/FormInputSelectSection";

interface EditFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: CreateFormResponse & { name: string; description: string }) => void;
  inputItems: InputDto[];
  editingItem: FormInfoItem | null;
}

export default function EditFormModal({
  isOpen,
  onClose,
  onSuccess,
  inputItems,
  editingItem,
}: EditFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [orderedInputIds, setOrderedInputIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadDetail, setLoadDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !editingItem) {
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadDetail(true);
      setDetailError(null);
      setError(null);
      setName((editingItem.name || "").trim() || "Chưa đặt tên");
      setDescription((editingItem.description || "").trim() || "");
      setOrderedInputIds([]);
      try {
        const detail = await fetchFormDetail(editingItem.id);
        if (cancelled) return;
        setName((detail.name || editingItem.name || "").trim() || "Chưa đặt tên");
        setDescription((detail.description || editingItem.description || "").trim() || "");
        const ordered: number[] = [];
        for (const i of detail.inputs || []) {
          const nid = Number(i.id);
          if (Number.isFinite(nid) && nid > 0) ordered.push(nid);
        }
        setOrderedInputIds(ordered);
      } catch (e) {
        if (!cancelled) {
          setDetailError("Không tải được chi tiết form. Vẫn có thể sửa tên / mô tả.");
        }
      } finally {
        if (!cancelled) setLoadDetail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, editingItem?.id]);

  if (!isOpen || !editingItem) return null;

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
      const updated = await updateForm(editingItem.id, {
        name: trimmedName,
        description: description.trim() || undefined,
        inputIds: orderedInputIds,
      });
      onSuccess({
        ...updated,
        name: updated.name ?? trimmedName,
        description: updated.description ?? "",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật form.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-panel-dark rounded-[32px] shadow-2xl w-full max-w-3xl p-6 sm:p-8 border border-white/10 my-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-form-title"
      >
        <h3
          id="edit-form-title"
          className="text-2xl font-bold text-white mb-6 tracking-tight"
        >
          Sửa form
        </h3>
        {detailError && (
          <div className="mb-3 rounded-xl bg-amber-500/15 border border-amber-500/30 px-4 py-2 text-sm text-amber-100">
            {detailError}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {loadDetail ? (
          <p className="text-sm text-white/60 py-8 text-center">Đang tải dữ liệu form…</p>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-form-name"
              className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1"
            >
              Tên form
            </label>
            <input
              id="edit-form-name"
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
              htmlFor="edit-form-description"
              className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1"
            >
              Mô tả form
            </label>
            <textarea
              id="edit-form-description"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-white/30 resize-none"
              placeholder="Nhập mô tả (tùy chọn)..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
          <FormInputSelectSection
            inputItems={inputItems}
            orderedInputIds={orderedInputIds}
            setOrderedInputIds={setOrderedInputIds}
            disabled={loading}
          />
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
              {loading ? "Đang lưu..." : "Cập nhật"}
            </GradientButton>
          </div>
        </form>
        )}
      </div>
    </div>
    </ModalPortal>
  );
}
