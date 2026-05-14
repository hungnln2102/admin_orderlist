import { useCallback, useEffect, useState } from "react";
import {
  CheckIcon,
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";
import ConfirmModal from "@/components/modals/ConfirmModal/ConfirmModal";
import { ArticleImageInsertModal } from "../components/ArticleImageInsertModal";
import type { Banner } from "../types";
import {
  createBanner,
  deleteBanner,
  fetchBanners,
  reorderBanners,
  toggleBanner,
  updateBanner,
} from "../api/contentApi";
import { BannerList } from "./banners-page/BannerList";
import { HeroFormFields } from "./banners-page/HeroFormFields";
import { bannerToForm, emptyForm, type HeroForm } from "./banners-page/form";

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
      // noop
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openImageModal = (mode: "create" | "edit") => {
    setImageModalMode(mode);
    setImageModalOpen(true);
  };

  const handleInsertImage = useCallback(
    (url: string) => {
      if (imageModalMode === "create") {
        setCreateForm((form) => ({ ...form, image_url: url }));
      } else if (imageModalMode === "edit") {
        setEditForm((form) => ({ ...form, image_url: url }));
      }
      setImageModalOpen(false);
      setImageModalMode(null);
    },
    [imageModalMode]
  );

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
  }, [editForm, editingId, load]);

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
          <HeroFormFields
            form={createForm}
            setForm={setCreateForm}
            onPickImage={() => openImageModal("create")}
          />
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
        <BannerList
          loading={loading}
          banners={banners}
          editingId={editingId}
          editForm={editForm}
          setEditForm={setEditForm}
          onOpenImageModal={() => openImageModal("edit")}
          onSaveEdit={handleSaveEdit}
          onCloseEdit={() => setEditingId(null)}
          onStartEdit={(banner) => {
            setEditingId(banner.id);
            setEditForm(bannerToForm(banner));
          }}
          onMove={handleMove}
          onToggle={handleToggle}
          onRequestDelete={setBannerIdPendingDelete}
        />
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
