import type React from "react";

import type { EditorMode } from "./types";

type RichTextEditorSurfaceProps = {
  mode: EditorMode;
  value: string;
  minHeight: string;
  placeholder: string;
  editorRef: React.RefObject<HTMLDivElement | null>;
  onChange: (value: string) => void;
  onVisualInput: () => void;
};

const RichTextEditorSurface: React.FC<RichTextEditorSurfaceProps> = ({
  mode,
  value,
  minHeight,
  placeholder,
  editorRef,
  onChange,
  onVisualInput,
}) => {
  if (mode === "html") {
    return (
      <textarea
        className="product-edit-editor__source w-full border px-4 py-4 text-sm outline-none transition-all"
        style={{ minHeight }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Nhập mã HTML source..."
        spellCheck={false}
      />
    );
  }

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={onVisualInput}
      className="product-edit-editor__canvas w-full overflow-y-auto border px-4 py-4 text-sm outline-none transition-all max-w-none"
      style={{ minHeight }}
      data-placeholder={placeholder}
    />
  );
};

export default RichTextEditorSurface;
