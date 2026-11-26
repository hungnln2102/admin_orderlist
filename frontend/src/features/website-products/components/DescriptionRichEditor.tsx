import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { sanitizeEditorialHtml } from "../editorialContent";
import { editorialExtensions, type EditorialImage } from "../editorialExtensions";
import { DescriptionImagePicker } from "./DescriptionImagePicker";
import { DescriptionLinkDialog } from "./DescriptionLinkDialog";
import { DescriptionToolbar } from "./DescriptionToolbar";

interface Props {
  initialHtml: string;
  readOnly: boolean;
  onChange: (html: string) => void;
  onCompositionChange: (composing: boolean) => void;
}

type Dialog =
  | { type: "image"; attributes?: EditorialImage }
  | { type: "link"; href: string; title: string };

export function DescriptionRichEditor({ initialHtml, readOnly, onChange, onCompositionChange }: Props) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const content = useMemo(() => sanitizeEditorialHtml(initialHtml), [initialHtml]);
  const editor = useEditor({
    extensions: editorialExtensions,
    content,
    editable: !readOnly,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "editorial-prose editorial-input",
        role: "textbox",
        "aria-label": "Nội dung mô tả",
        "aria-placeholder": "Nhập nội dung mô tả…",
        "aria-multiline": "true",
      },
      transformPastedHTML: (html) => sanitizeEditorialHtml(html),
      handleDOMEvents: {
        compositionstart: () => { onCompositionChange(true); return false; },
        compositionend: () => { onCompositionChange(false); return false; },
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML()),
  });

  useEffect(() => {
    editor?.setEditable(!readOnly, false);
  }, [editor, readOnly]);

  if (!editor) return null;

  const closeDialog = () => {
    setDialog(null);
    editor.commands.focus();
  };

  return (
    <div className="min-w-0">
      <DescriptionToolbar
        editor={editor}
        readOnly={readOnly}
        onLink={() => {
          const { href, title } = editor.getAttributes("link");
          setDialog({ type: "link", href: href ?? "", title: title ?? "" });
        }}
        onImage={() => setDialog({
          type: "image",
          attributes: editor.isActive("editorialFigure") ? editor.getAttributes("editorialFigure") as EditorialImage : undefined,
        })}
      />
      <div className={editor.isEmpty && !readOnly ? "editorial-empty" : ""}>
        <EditorContent editor={editor} />
      </div>
      {dialog?.type === "image" && (
        <DescriptionImagePicker
          initialImage={dialog.attributes}
          onClose={closeDialog}
          onInsert={(image) => {
            setDialog(null);
            const chain = editor.chain().focus();
            if (dialog.attributes) chain.updateAttributes("editorialFigure", image).run();
            else chain.insertContent({ type: "editorialFigure", attrs: image }).run();
          }}
        />
      )}
      {dialog?.type === "link" && (
        <DescriptionLinkDialog
          initialHref={dialog.href}
          initialTitle={dialog.title}
          onClose={closeDialog}
          onSubmit={(href, title) => {
            setDialog(null);
            const chain = editor.chain().focus().extendMarkRange("link");
            if (editor.state.selection.empty && !dialog.href) {
              chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href, title } }] }).run();
            } else {
              chain.setMark("link", { href, title }).run();
            }
          }}
        />
      )}
    </div>
  );
}
