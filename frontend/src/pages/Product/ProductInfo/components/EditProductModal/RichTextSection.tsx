import React from "react";
import { EditorContext } from "./types";

type RichTextSectionProps = {
  label: string;
  toolbar: React.ReactNode;
  editorRef: React.RefObject<HTMLDivElement>;
  editorKey: string;
  context: EditorContext;
  onFocusEditor: (context: EditorContext) => void;
  onSyncEditor: (context: EditorContext, element: HTMLDivElement | null) => void;
};

export const RichTextSection: React.FC<RichTextSectionProps> = ({
  label,
  toolbar,
  editorRef,
  editorKey,
  context,
  onFocusEditor,
  onSyncEditor,
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
      {label}
    </label>
    {toolbar}
    <div
      key={editorKey}
      ref={editorRef}
      className="rich-editor"
      contentEditable
      suppressContentEditableWarning
      onFocus={() => onFocusEditor(context)}
      onInput={(e) => onSyncEditor(context, e.currentTarget)}
      onBlur={(e) => onSyncEditor(context, e.currentTarget)}
    />
  </div>
);
