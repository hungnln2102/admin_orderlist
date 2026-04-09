import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import {
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XMarkIcon,
  CheckIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";
import ConfirmModal from "@/components/modals/ConfirmModal/ConfirmModal";
import { ArticleImageInsertModal } from "../components/ArticleImageInsertModal";
import type { Banner } from "../types";
import {
  fetchBanners,
  createBanner,
  updateBanner,
  toggleBanner,
  reorderBanners,
  deleteBanner,
} from "../api/contentApi";

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none backdrop-blur-md focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400";

type HeroForm = {
  title: string;
  description: string;
  tag_text: string;
  image_url: string;
  image_alt: string;
  button_label: string;
  button_href: string;
};

const emptyForm = (): HeroForm => ({
  title: "",
  description: "",
  tag_text: "",
  image_url: "",
  image_alt: "",
  button_label: "",
  button_href: "",
});

function bannerToForm(b: Banner): HeroForm {
  return {
    title: b.title ?? "",
    description: b.description ?? "",
    tag_text: b.tag_text ?? "",
    image_url: b.image_url ?? "",
    image_alt: b.image_alt ?? "",
    button_label: b.button_label ?? "",
    button_href: b.button_href ?? "",
  };
}

function ImagePickerBlock(props: {
  imageUrl: string;
  onPickClick: () => void;
  onClear: () => void;
}) {
  const { imageUrl, onPickClick, onClear } = props;
  return (
    <div>
      <label className={labelClass}>Ảnh nền</label>
      {imageUrl ? (
        <div className="group relative max-w-xl">
          <img
            src={imageUrl}
            alt=""
            className="max-h-48 w-full cursor-pointer rounded-xl border border-white/10 object-contain"
            onClick={onPickClick}
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 rounded bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPickClick}
          className="flex min-h-[120px] w-full max-w-xl items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-sm text-slate-500 transition-colors hover:border-sky-500/40"
        >
          Chọn ảnh
        </button>
      )}
    </div>
  );
}

function HeroFormFields(props: {
  form: HeroForm;
  setForm: Dispatch<SetStateAction<HeroForm>>;
  onPickImage: () => void;
}) {
  const { form, setForm, onPickImage } = props;
  const patch = (field: keyof HeroForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <ImagePickerBlock
        imageUrl={form.image_url}
        onPickClick={onPickImage}
        onClear={() => patch("image_url", "")}
      />
      <div>
        <label className={labelClass}>Tiêu đề (hero / H1 trên site)</label>
        <input
          className={fieldClass}
          value={form.title}
          onChange={(e) => patch("title", e.target.value)}
          placeholder="VD: Mavryk Premium Store - Phần mềm bản quyền…"
        />
      </div>
      <div>
        <label className={labelClass}>Mô tả</label>
        <textarea
          className={`${fieldClass} min-h-[88px] resize-y`}
          value={form.description}
          onChange={(e) => patch("description", e.target.value)}
          placeholder="Đoạn mô tả ngắn dưới tiêu đề"
        />
      </div>
      <div>
        <label className={labelClass}>Nhãn chip (VD: GIỚI THIỆU)</label>
        <input
          className={fieldClass}
          value={form.tag_text}
          onChange={(e) => patch("tag_text", e.target.value)}
          placeholder="Tùy chọn"
        />
      </div>
      <div>
        <label className={labelClass}>Alt ảnh (SEO / trợ năng)</label>
        <input
          className={fieldClass}
          value={form.image_alt}
          onChange={(e) => patch("image_alt", e.target.value)}
          placeholder="Mô tả ngắn nội dung ảnh"
        />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Nút hành động (tùy chọn)
        </p>
        <p className="mb-3 text-xs text-slate-500">
          Chỉ hiển thị khi <strong className="text-slate-400">cả</strong> chữ nút và đường dẫn đều có nội dung.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Chữ nút</label>
            <input
              className={fieldClass}
              value={form.button_label}
              onChange={(e) => patch("button_label", e.target.value)}
              placeholder="VD: Tìm hiểu thêm"
            />
          </div>
          <div>
            <label className={labelClass}>Liên kết (/, /about, https://…)</label>
            <input
              className={fieldClass}
              value={form.button_href}
              onChange={(e) => patch("button_href", e.target.value)}
              placeholder="/about"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<HeroForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<HeroForm>(emptyForm);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalMode, setImageModalMode] = useState<"create" | "edit" | null>(null);
  const [bannerIdPendingDelete, setBannerIdPendingDelete] = useState<number | null>(null);
  const [bannerDeleteSubmitting, setBannerDeleteSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBanners(await fetchBanners());
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInsertImage = useCallback(
    (url: string) => {
      if (imageModalMode === "create") {
        setCreateForm((f) => ({ ...f, image_url: url }));
      } else if (imageModalMode === "edit") {
        setEditForm((f) => ({ ...f, image_url: url }));
      }
      setImageModalOpen(false);
      setImageModalMode(null);
    },
    [imageModalMode]
  );

  const openImageModal = (mode: "create" | "edit") => {
    setImageModalMode(mode);
    setImageModalOpen(true);
  };

  const handleCreate = useCallback(async () => {
    if (!createForm.image_url.trim() || !createForm.title.trim()) return;
    try {
      await createBanner({
        image_url: createForm.image_url.trim(),
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        tag_text: createForm.tag_text.trim(),
        image_alt: createForm.image_alt.trim(),
        button_label: createForm.button_label.trim(),
        button_href: createForm.button_href.trim(),
      });
      setCreateForm(emptyForm());
      setShowCreate(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi tạo banner.");
    }
  }, [createForm, load]);

  const handleSaveEdit = useCallback(async () => {
    if (editingId == null) return;
    if (!editForm.image_url.trim() || !editForm.title.trim()) return;
    try {
      await updateBanner(editingId, {
        image_url: editForm.image_url.trim(),
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        tag_text: editForm.tag_text.trim(),
        image_alt: editForm.image_alt.trim(),
        button_label: editForm.button_label.trim(),
        button_href: editForm.button_href.trim(),
      });
      setEditingId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi lưu banner.");
    }
  }, [editingId, editForm, load]);

  const requestDeleteBanner = useCallback((id: number) => {
    setBannerIdPendingDelete(id);
  }, []);

  const confirmDeleteBanner = useCallback(async () => {
    if (bannerIdPendingDelete == null) return;
    setBannerDeleteSubmitting(true);
    try {
      await deleteBanner(bannerIdPendingDelete);
      if (editingId === bannerIdPendingDelete) setEditingId(null);
      load();
      setBannerIdPendingDelete(null);
    } catch {
      alert("Xóa thất bại.");
    } finally {
      setBannerDeleteSubmitting(false);
    }
  }, [bannerIdPendingDelete, editingId, load]);

  const handleToggle = useCallback(
    async (id: number) => {
      try {
        await toggleBanner(id);
        load();
      } catch {
        alert("Lỗi bật/tắt banner.");
      }
    },
    [load]
  );

  const handleMove = useCallback(
    async (id: number, direction: "up" | "down") => {
      const idx = banners.findIndex((b) => b.id === id);
      if (idx < 0) return;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= banners.length) return;
      const next = [...banners];
      [next[idx], next[target]] = [next[target], next[idx]];
      setBanners(next);
      try {
        const ordered = await reorderBanners(next.map((b) => b.id));
        setBanners(ordered);
      } catch {
        load();
      }
    },
    [banners, load]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <PhotoIcon className="h-7 w-7 text-sky-400" />
            Banner trang chủ
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Hero slide: ảnh nền, tiêu đề, mô tả, nhãn, alt; nút CTA bắt buộc đủ chữ + link mới hiện.
          </p>
        </div>
        <GradientButton icon={PlusIcon} onClick={() => setShowCreate(true)}>
          Thêm banner
        </GradientButton>
      </div>

      {showCreate && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-bold text-white">Thêm banner hero mới</h3>
          <HeroFormFields form={createForm} setForm={setCreateForm} onPickImage={() => openImageModal("create")} />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!createForm.image_url.trim() || !createForm.title.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-40"
            >
              <CheckIcon className="h-4 w-4" />
              Lưu
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateForm(emptyForm());
                setShowCreate(false);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-slate-400 transition-colors hover:bg-white/10"
            >
              <XMarkIcon className="h-4 w-4" />
              Hủy
            </button>
          </div>
        </div>
      )}

      <ArticleImageInsertModal
        isOpen={imageModalOpen}
        onClose={() => {
          setImageModalOpen(false);
          setImageModalMode(null);
        }}
        onInsert={handleInsertImage}
      />

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center backdrop-blur-md">
            <p className="text-sm text-slate-500">Đang tải...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center backdrop-blur-md">
            <PhotoIcon className="mx-auto h-12 w-12 text-slate-600" />
            <p className="mt-3 text-sm text-slate-500">Chưa có banner nào.</p>
          </div>
        ) : (
          banners.map((banner) => (
            <div
              key={banner.id}
              className={`rounded-2xl border bg-white/[0.03] p-4 backdrop-blur-md transition-all ${
                banner.active ? "border-white/10" : "border-white/5 opacity-50"
              }`}
            >
              {editingId === banner.id ? (
                <div>
                  <h3 className="mb-4 text-sm font-bold text-white">Chỉnh sửa banner #{banner.id}</h3>
                  <HeroFormFields form={editForm} setForm={setEditForm} onPickImage={() => openImageModal("edit")} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={!editForm.image_url.trim() || !editForm.title.trim()}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-40"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
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
                        onClick={() => handleToggle(banner.id)}
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
                      onClick={() => {
                        setEditingId(banner.id);
                        setEditForm(bannerToForm(banner));
                      }}
                      className="rounded-lg p-1.5 text-sky-400 transition-colors hover:bg-white/10"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Lên"
                      onClick={() => handleMove(banner.id, "up")}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Xuống"
                      onClick={() => handleMove(banner.id, "down")}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Xóa"
                      onClick={() => requestDeleteBanner(banner.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-rose-400"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={bannerIdPendingDelete !== null}
        onClose={() => {
          if (!bannerDeleteSubmitting) setBannerIdPendingDelete(null);
        }}
        onConfirm={() => void confirmDeleteBanner()}
        title="Xóa banner?"
        message="Bạn có chắc muốn xóa banner này? Hành động không thể hoàn tác."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        isSubmitting={bannerDeleteSubmitting}
      />
    </div>
  );
}
