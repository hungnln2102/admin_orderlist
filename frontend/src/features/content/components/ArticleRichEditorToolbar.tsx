import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";
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

const barBtn =
  "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-transparent px-2 text-slate-300 transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-35";

const barBtnActive = "border-sky-500/40 bg-sky-500/15 text-sky-200";

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: ToolbarButtonProps) {
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

type ArticleRichEditorToolbarProps = {
  editor: Editor;
  htmlMode: boolean;
  onOpenLink: () => void;
  onOpenImage: () => void;
  onToggleHtmlMode: () => void;
};

export function ArticleRichEditorToolbar({
  editor,
  htmlMode,
  onOpenLink,
  onOpenImage,
  onToggleHtmlMode,
}: ArticleRichEditorToolbarProps) {
  const toolDisabled = htmlMode;

  return (
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
        onClick={onOpenLink}
        active={editor.isActive("link")}
        disabled={toolDisabled}
      >
        <LinkIcon className="h-5 w-5" />
      </ToolbarButton>
      <ToolbarButton
        title="Chèn ảnh"
        onClick={onOpenImage}
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
        onClick={onToggleHtmlMode}
        active={htmlMode}
      >
        <CodeBracketSquareIcon className="h-5 w-5" />
      </ToolbarButton>
    </div>
  );
}
