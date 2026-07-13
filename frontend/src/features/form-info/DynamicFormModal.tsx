import { useEffect, useState, useMemo } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import GradientButton from "@/components/ui/GradientButton";
import {
  createForm,
  updateForm,
  fetchFormDetail,
  type CreateFormResponse,
  type InputDto,
} from "@/lib/formsApi";
import type { FormInfoItem } from "./types";
import { FormInputSelectSection } from "./components/FormInputSelectSection";

interface DynamicFormModalProps {
  mode: "create" | "edit";
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: CreateFormResponse & { name: string; description: string }) => void;
  inputItems: InputDto[];
  editingItem?: FormInfoItem | null;
}

export default function DynamicFormModal({
  mode,
  isOpen,
  onClose,
  onSuccess,
  inputItems,
  editingItem,
}: DynamicFormModalProps) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [orderedInputIds, setOrderedInputIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEdit && editingItem) {
        setName(editingItem.name);
        setDescription(editingItem.description || "");
        setLoading(true);
        fetchFormDetail(editingItem.id)
          .then((detail) => {
            setOrderedInputIds(detail.inputs.map((i) => i.id));
            setLoading(false);
          })
          .catch(() => {
            setError("Không thể tải chi tiết form.");
            setLoading(false);
          });
      } else {
        setName("");
        setDescription("");
        setOrderedInputIds([]);
        setError(null);
        setLoading(false);
      }
    }
  }, [isOpen, isEdit, editingItem]);

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
      if (isEdit && editingItem) {
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
      } else {
        const created = await createForm({
          name: trimmedName,
          description: description.trim() || undefined,
          inputIds: orderedInputIds,
        });
        onSuccess({
          ...created,
          name: created.name ?? trimmedName,
          description: created.description ?? "",
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Không thể ${isEdit ? "cập nhật" : "tạo"} form.`);
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
        >
          <h3 className="text-2xl font-bold text-white mb-6 tracking-tight">
            {isEdit ? "Sửa form" : "Tạo form"}
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
                {loading ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo form"}
              </GradientButton>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
