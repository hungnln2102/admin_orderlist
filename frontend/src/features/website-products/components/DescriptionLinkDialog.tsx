import { useState, type FormEvent } from "react";
import { BaseModal } from "@/shared/components";
import { isEditorialLink } from "../editorialContent";

interface Props {
  initialHref: string;
  initialTitle: string;
  onClose: () => void;
  onSubmit: (href: string, title: string) => void;
}

const input = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100";

export function DescriptionLinkDialog({ initialHref, initialTitle, onClose, onSubmit }: Props) {
  const [href, setHref] = useState(initialHref);
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState("");
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!isEditorialLink(href.trim())) {
      setError("Nhập địa chỉ liên kết đầy đủ, ví dụ https://example.com.");
      return;
    }
    onSubmit(href.trim(), title.trim());
  };
  return (
    <BaseModal isOpen onClose={onClose} title={initialHref ? "Chỉnh sửa liên kết" : "Chèn liên kết"}>
      <form onSubmit={save} className="space-y-4">
        <label className="block space-y-1 text-sm text-slate-300">
          <span>Địa chỉ liên kết</span>
          <input autoFocus className={input} value={href} onChange={(event) => setHref(event.target.value)} placeholder="https://" />
        </label>
        <label className="block space-y-1 text-sm text-slate-300">
          <span>Tiêu đề liên kết</span>
          <input className={input} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Hủy</button>
          <button type="submit" className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">{initialHref ? "Lưu liên kết" : "Chèn liên kết"}</button>
        </div>
      </form>
    </BaseModal>
  );
}
