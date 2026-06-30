import { useCallback, useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { UrlPromptModal } from "@/components/modals/UrlPromptModal/UrlPromptModal";
import { ArticleImageInsertModal } from "@/features/content/components/ArticleImageInsertModal";
import { ArticleRichEditorToolbar } from "./ArticleRichEditorToolbar";

export type ArticleRichEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function ArticleRichEditor({
  value,
  onChange,
  placeholder = "Viết nội dung bài viết tại đây...",
}: ArticleRichEditorProps) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkInitial, setLinkInitial] = useState("https://");
  const [linkHadMark, setLinkHadMark] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { HTMLAttributes: { class: "list-disc pl-6 my-2" } },
        orderedList: { HTMLAttributes: { class: "list-decimal pl-6 my-2" } },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-sky-400 underline underline-offset-2 hover:text-sky-300",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg border border-white/10 my-3",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "tiptap prose-invert min-h-[280px] max-w-none px-4 py-3 text-[15px] leading-7 text-slate-100 outline-none " +
          "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2 " +
          "[&_p]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-sky-500/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-300 " +
          "[&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_pre]:rounded-xl [&_pre]:bg-slate-950/80 [&_pre]:p-4 [&_pre]:text-sm",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || htmlMode) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next === current) return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value, htmlMode]);

  const toggleHtmlMode = useCallback(() => {
    if (!editor) return;
    if (!htmlMode) {
      setHtmlSource(editor.getHTML());
      setHtmlMode(true);
      return;
    }
    const next = htmlSource;
    editor.commands.setContent(next || "<p></p>", { emitUpdate: false });
    onChange(editor.getHTML());
    setHtmlMode(false);
  }, [editor, htmlMode, htmlSource, onChange]);

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const prev = (editor.getAttributes("link").href as string | undefined) || "";
    setLinkInitial(prev.trim() || "https://");
    setLinkHadMark(editor.isActive("link"));
    setLinkModalOpen(true);
  }, [editor]);

  const applyLink = useCallback(
    (url: string) => {
      if (!editor) return;
      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    },
    [editor]
  );

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  }, [editor]);

  const applyImage = useCallback(
    (url: string) => {
      if (!editor || !url) return;
      editor.chain().focus().setImage({ src: url }).run();
    },
    [editor]
  );

  if (!editor) {
    return (
      <div className="min-h-[340px] animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
    );
  }


  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <ArticleRichEditorToolbar
        editor={editor}
        htmlMode={htmlMode}
        onOpenLink={openLinkModal}
        onOpenImage={() => setImageModalOpen(true)}
        onToggleHtmlMode={toggleHtmlMode}
      />
      <div className={htmlMode ? "hidden" : undefined} aria-hidden={htmlMode}>
        <EditorContent editor={editor} />
      </div>
      {htmlMode ? (
        <textarea
          value={htmlSource}
          onChange={(e) => {
            const v = e.target.value;
            setHtmlSource(v);
            onChange(v);
          }}
          spellCheck={false}
          className="block min-h-[280px] w-full resize-y bg-slate-950/80 px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-100 outline-none ring-sky-500/30 focus:ring-2"
          aria-label="Mã HTML nội dung"
        />
      ) : null}

      <UrlPromptModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title="Liên kết"
        description="Nhập URL đầy đủ (https://...). Để trống và bấm Áp dụng để gỡ liên kết đang chọn."
        initialValue={linkInitial}
        placeholder="https://"
        confirmLabel="Áp dụng"
        tertiaryLabel={linkHadMark ? "Gỡ liên kết" : undefined}
        onTertiary={linkHadMark ? removeLink : undefined}
        onConfirm={applyLink}
      />
      <ArticleImageInsertModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onInsert={(url) => applyImage(url)}
      />
    </div>
  );
}
