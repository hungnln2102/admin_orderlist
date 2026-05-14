import { XMarkIcon } from "@heroicons/react/24/outline";
import type { Dispatch, SetStateAction } from "react";
import { fieldClass, labelClass, type HeroForm } from "./form";

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

type Props = {
  form: HeroForm;
  setForm: Dispatch<SetStateAction<HeroForm>>;
  onPickImage: () => void;
};

export function HeroFormFields({ form, setForm, onPickImage }: Props) {
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
