import { useEffect, useState, type FormEvent } from "react";
import { BaseModal } from "@/shared/components";
import { isSecureImage } from "../editorialContent";
import { listImages } from "../websiteProductsApi";
import type { ProductImage } from "../types";
import type { EditorialImage } from "../editorialExtensions";

interface Props {
  onClose: () => void;
  initialImage?: EditorialImage;
  onInsert: (image: EditorialImage) => void;
}

const inputClassName = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100";

export function DescriptionImagePicker({ initialImage, onClose, onInsert }: Props) {
  const [url, setUrl] = useState(initialImage?.src ?? "");
  const [alt, setAlt] = useState(initialImage?.alt ?? "");
  const [title, setTitle] = useState(initialImage?.title ?? "");
  const [caption, setCaption] = useState(initialImage?.caption ?? "");
  const [alignment, setAlignment] = useState(initialImage?.textAlign ?? "left");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    listImages(controller.signal).then((result) => {
      if (!controller.signal.aborted) setItems(result.items.filter(({ url: src }) => isSecureImage(src)));
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setLoadError(error.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  const matching = items.filter(({ key }) => key.toLowerCase().includes(query.toLowerCase().trim()));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!isSecureImage(url.trim())) {
      setFormError("Nhập địa chỉ ảnh HTTPS hợp lệ hoặc chọn ảnh trong thư viện.");
      return;
    }
    onInsert({ src: url.trim(), alt: alt.trim(), title: title.trim(), caption: caption.trim(), textAlign: alignment });
  };

  return (
    <BaseModal isOpen onClose={onClose} title={initialImage ? "Chỉnh sửa ảnh" : "Chèn ảnh vào mô tả"} size="2xl">
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1 text-sm text-slate-300">
          <span>Địa chỉ ảnh HTTPS</span>
          <input className={inputClassName} value={url} onChange={(event) => { setUrl(event.target.value); setFormError(""); }} placeholder="https://" autoFocus />
        </label>
        <label className="block space-y-1 text-sm text-slate-300">
          <span>Mô tả thay thế</span>
          <input className={inputClassName} value={alt} onChange={(event) => setAlt(event.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm text-slate-300">
            <span>Chú thích hiển thị</span>
            <input className={inputClassName} value={caption} onChange={(event) => setCaption(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm text-slate-300">
            <span>Tiêu đề ảnh</span>
            <input className={inputClassName} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
        </div>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1 text-sm text-slate-300">Căn ảnh</legend>
          {[{ value: "left", label: "Trái" }, { value: "center", label: "Giữa" }, { value: "right", label: "Phải" }].map((option) => (
            <label key={option.value} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm">
              <input type="radio" name="description-image-alignment" value={option.value} checked={alignment === option.value} onChange={() => setAlignment(option.value)} />
              {option.label}
            </label>
          ))}
        </fieldset>
        <label className="block space-y-1 text-sm text-slate-300">
          <span>Tìm trong thư viện ảnh</span>
          <input className={inputClassName} type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        {loading && <p role="status" className="text-sm text-slate-400">Đang tải thư viện ảnh…</p>}
        {loadError && <p role="alert" className="text-sm text-amber-300">{loadError}</p>}
        {!loading && !loadError && !matching.length && <p className="text-sm text-slate-400">Chưa có ảnh phù hợp.</p>}
        {matching.length > 0 && (
          <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {matching.map((item) => (
              <button type="button" key={item.key} onClick={() => { setUrl(item.url); setFormError(""); }} aria-pressed={url === item.url}
                className="min-w-0 rounded-lg border border-slate-700 p-1.5 hover:border-cyan-500 aria-pressed:border-cyan-400">
                <img src={item.url} alt="" loading="lazy" className="aspect-video w-full rounded object-contain" />
                <span className="block truncate text-xs text-slate-300" title={item.key}>{item.key}</span>
              </button>
            ))}
          </div>
        )}
        {formError && <p role="alert" className="text-sm text-rose-300">{formError}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Hủy</button>
          <button type="submit" className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">{initialImage ? "Lưu ảnh" : "Chèn ảnh"}</button>
        </div>
      </form>
    </BaseModal>
  );
}
