import { useState, useCallback, useEffect } from "react";
import {
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";
import { ArticleImageInsertModal } from "../components/ArticleImageInsertModal";
import type { Banner } from "../types";
import {
  fetchBanners,
  createBanner,
  toggleBanner,
  reorderBanners,
  deleteBanner,
} from "../api/contentApi";

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none backdrop-blur-md focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400";

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [imageModalOpen, setImageModalOpen] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  const handleCreate = useCallback(async () => {
    if (!newImageUrl.trim()) return;
    try {
      await createBanner({ image_url: newImageUrl.trim() });
      setNewImageUrl("");
      setShowCreate(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi tạo banner.");
    }
  }, [newImageUrl, load]);

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm("Xóa banner này?")) return;
    try {
      await deleteBanner(id);
      load();
    } catch {
      alert("Xóa thất bại.");
    }
  }, [load]);

  const handleToggle = useCallback(async (id: number) => {
    try {
      await toggleBanner(id);
      load();
    } catch {
      alert("Lỗi bật/tắt banner.");
    }
  }, [load]);

  const handleMove = useCallback(async (id: number, direction: "up" | "down") => {
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
  }, [banners, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <PhotoIcon className="h-7 w-7 text-sky-400" />
            Banner trang chủ
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Chỉ cần tải ảnh — banner tĩnh, không tiêu đề và không link đích.
          </p>
        </div>
        <GradientButton icon={PlusIcon} onClick={() => setShowCreate(true)}>
          Thêm banner
        </GradientButton>
      </div>

      {showCreate && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-bold text-white">Thêm banner mới</h3>
          <div className="max-w-xl">
            <label className={labelClass}>Ảnh banner</label>
            {newImageUrl ? (
              <div className="group relative">
                <img
                  src={newImageUrl}
                  alt="Preview"
                  className="max-h-40 w-full cursor-pointer rounded-xl border border-white/10 object-contain"
                  onClick={() => setImageModalOpen(true)}
                />
                <button
                  type="button"
                  onClick={() => setNewImageUrl("")}
                  className="absolute right-2 top-2 rounded bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setImageModalOpen(true)}
                className="flex min-h-[120px] w-full items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-sm text-slate-500 transition-colors hover:border-sky-500/40"
              >
                Chọn ảnh
              </button>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newImageUrl.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-40"
            >
              <CheckIcon className="h-4 w-4" />
              Lưu
            </button>
            <button
              type="button"
              onClick={() => {
                setNewImageUrl("");
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
        onClose={() => setImageModalOpen(false)}
        onInsert={(url) => setNewImageUrl(url)}
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
              className={`flex items-center gap-4 rounded-2xl border bg-white/[0.03] p-4 backdrop-blur-md transition-all ${
                banner.active ? "border-white/10" : "border-white/5 opacity-50"
              }`}
            >
              <img
                src={banner.image_url}
                alt=""
                className="h-16 w-28 shrink-0 rounded-xl border border-white/10 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-300">Ảnh tĩnh</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Thứ tự: {banner.sort_order}</span>
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
              <div className="flex shrink-0 items-center gap-1">
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
                  onClick={() => handleDelete(banner.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-rose-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
