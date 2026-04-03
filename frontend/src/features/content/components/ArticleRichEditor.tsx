import { useCallback, useEffect, useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  BoldIcon,
  CodeBracketIcon,
  CodeBracketSquareIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  NumberedListIcon,
  PhotoIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  MinusIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";
import { UrlPromptModal } from "@/components/modals/UrlPromptModal/UrlPromptModal";
import { ArticleImageInsertModal } from "@/features/content/components/ArticleImageInsertModal";

export type ArticleRichEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const barBtn =
  "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-transparent px-2 text-slate-300 transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-35";

const barBtnActive = "border-sky-500/40 bg-sky-500/15 text-sky-200";

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`${barBtn} ${active ? barBtnActive : ""}`}
    >
      {children}
    </button>
  );
}

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

  const toolDisabled = htmlMode;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-white/10 bg-slate-950/40 px-2 py-2"
        role="toolbar"
        aria-label="Thanh định dạng nội dung"
      >
        <ToolbarButton
          title="Đậm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          disabled={toolDisabled}
        >
          <BoldIcon className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          title="Nghiêng"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          disabled={toolDisabled}
        >
          <ItalicIcon className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          title="Gạch chân"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          disabled={toolDisabled}
        >
          <span className="text-sm font-bold underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          title="Gạch ngang"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          disabled={toolDisabled}
        >
          <span className="text-sm font-bold line-through">S</span>
        </ToolbarButton>
        <ToolbarButton
          title="Mã inline"
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          disabled={toolDisabled}
        >
          <CodeBracketIcon className="h-5 w-5" />
        </ToolbarButton>

        <span className="mx-1 hidden h-6 w-px bg-white/15 sm:inline" aria-hidden />

        <ToolbarButton
          title="Tiêu đề cấp 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          disabled={toolDisabled}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Tiêu đề cấp 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          disabled={toolDisabled}
        >
          H3
        </ToolbarButton>

        <span className="mx-1 hidden h-6 w-px bg-white/15 sm:inline" aria-hidden />

        <ToolbarButton
          title="Danh sách bullet"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          disabled={toolDisabled}
        >
          <ListBulletIcon className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          title="Danh sách số"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          disabled={toolDisabled}
        >
          <NumberedListIcon className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          title="Trích dẫn"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          disabled={toolDisabled}
        >
          <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
        </ToolbarButton>

        <span className="mx-1 hidden h-6 w-px bg-white/15 sm:inline" aria-hidden />

        <ToolbarButton
          title="Chèn liên kết"
          onClick={openLinkModal}
          active={editor.isActive("link")}
          disabled={toolDisabled}
        >
          <LinkIcon className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          title="Chèn ảnh"
          onClick={() => setImageModalOpen(true)}
          disabled={toolDisabled}
        >
          <PhotoIcon className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          title="Đường kẻ ngang"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={toolDisabled}
        >
          <MinusIcon className="h-5 w-5" />
        </ToolbarButton>

        <span className="mx-1 hidden h-6 w-px bg-white/15 sm:inline" aria-hidden />

        <ToolbarButton
          title="Hoàn tác"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={toolDisabled || !editor.can().undo()}
        >
          <ArrowUturnLeftIcon className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          title="Làm lại"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={toolDisabled || !editor.can().redo()}
        >
          <ArrowUturnRightIcon className="h-5 w-5" />
        </ToolbarButton>

        <span className="mx-1 hidden h-6 w-px bg-white/15 sm:inline" aria-hidden />

        <ToolbarButton
          title={htmlMode ? "Quay lại soạn thảo (WYSIWYG)" : "Sửa HTML thô"}
          onClick={toggleHtmlMode}
          active={htmlMode}
        >
          <CodeBracketSquareIcon className="h-5 w-5" />
        </ToolbarButton>
      </div>
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
