import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilSquareIcon,
  PhotoIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Banner } from "../../types";
import { HeroFormFields } from "./HeroFormFields";
import type { HeroForm } from "./form";
import type { Dispatch, SetStateAction } from "react";

type Props = {
  loading: boolean;
  banners: Banner[];
  editingId: number | null;
  editForm: HeroForm;
  setEditForm: Dispatch<SetStateAction<HeroForm>>;
  onOpenImageModal: () => void;
  onSaveEdit: () => void;
  onCloseEdit: () => void;
  onStartEdit: (banner: Banner) => void;
  onMove: (id: number, direction: "up" | "down") => void;
  onToggle: (id: number) => void;
  onRequestDelete: (id: number) => void;
};

export function BannerList({
  loading,
  banners,
  editingId,
  editForm,
  setEditForm,
  onOpenImageModal,
  onSaveEdit,
  onCloseEdit,
  onStartEdit,
  onMove,
  onToggle,
  onRequestDelete,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center backdrop-blur-md">
        <p className="text-sm text-slate-500">Đang tải...</p>
      </div>
    );
  }

  if (banners.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center backdrop-blur-md">
        <PhotoIcon className="mx-auto h-12 w-12 text-slate-600" />
        <p className="mt-3 text-sm text-slate-500">Chưa có banner nào.</p>
      </div>
    );
  }

  return (
    <>
      {banners.map((banner) => (
        <div
          key={banner.id}
          className={`rounded-2xl border bg-white/[0.03] p-4 backdrop-blur-md transition-all ${
            banner.active ? "border-white/10" : "border-white/5 opacity-50"
          }`}
        >
          {editingId === banner.id ? (
            <div>
              <h3 className="mb-4 text-sm font-bold text-white">Chỉnh sửa banner #{banner.id}</h3>
              <HeroFormFields
                form={editForm}
                setForm={setEditForm}
                onPickImage={onOpenImageModal}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSaveEdit}
                  disabled={!editForm.image_url.trim() || !editForm.title.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-40"
                >
                  <CheckIcon className="h-4 w-4" />
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={onCloseEdit}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-slate-400 transition-colors hover:bg-white/10"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <img
                src={banner.image_url}
                alt=""
                className="h-20 w-32 shrink-0 rounded-xl border border-white/10 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold text-white">{banner.title || "—"}</p>
                {banner.tag_text ? (
                  <span className="mt-1 inline-block rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-300">
                    {banner.tag_text}
                  </span>
                ) : null}
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{banner.description || "—"}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">Thứ tự: {banner.sort_order}</span>
                  {banner.button_label && banner.button_href ? (
                    <span className="text-xs text-emerald-400/90">
                      CTA: {banner.button_label} → {banner.button_href}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">Không có nút</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggle(banner.id)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      banner.active
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-500/15 text-slate-400"
                    }`}
                  >
                    {banner.active ? "Đang hiện" : "Đang ẩn"}
                  </button>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                <button
                  type="button"
                  title="Sửa"
                  onClick={() => onStartEdit(banner)}
                  className="rounded-lg p-1.5 text-sky-400 transition-colors hover:bg-white/10"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Lên"
                  onClick={() => onMove(banner.id, "up")}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Xuống"
                  onClick={() => onMove(banner.id, "down")}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ArrowDownIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Xóa"
                  onClick={() => onRequestDelete(banner.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-rose-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
