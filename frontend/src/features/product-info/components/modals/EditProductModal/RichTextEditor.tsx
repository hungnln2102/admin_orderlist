import React, { useEffect, useRef, useState } from "react";

import { EDITOR_STYLE_TEXT } from "./rich-text-editor/constants";
import RichTextEditorSurface from "./rich-text-editor/RichTextEditorSurface";
import RichTextEditorToolbar from "./rich-text-editor/RichTextEditorToolbar";
import type { EditorMode, RichTextEditorProps } from "./rich-text-editor/types";

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  minHeight = "200px",
  helperText,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const [mode, setMode] = useState<EditorMode>("visual");

  useEffect(() => {
    if (mode !== "visual") return;
    if (!editorRef.current || isUpdatingRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [mode, value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    isUpdatingRef.current = true;
    onChange(editorRef.current.innerHTML);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  };

  const ensureVisualMode = () => {
    if (mode !== "visual") {
      setMode("visual");
    }
  };

  const execCommand = (command: string, commandValue?: string) => {
    ensureVisualMode();
    document.execCommand(command, false, commandValue);
    editorRef.current?.focus();
    handleInput();
  };

  const formatBlock = (tag: string) => {
    execCommand("formatBlock", tag);
  };

  const insertLink = () => {
    const url = prompt("Nhập URL liên kết:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const switchMode = (nextMode: EditorMode) => {
    if (nextMode === mode) return;
    if (nextMode === "html" && editorRef.current) {
      onChange(editorRef.current.innerHTML || "");
    }
    setMode(nextMode);
  };

  return (
    <div className="product-edit-editor space-y-3">
      <label className="product-edit-editor__label block text-xs font-semibold uppercase tracking-wide">
        {label}
      </label>
      {helperText ? (
        <p className="product-edit-editor__helper text-xs">{helperText}</p>
      ) : null}

      <RichTextEditorToolbar
        label={label}
        mode={mode}
        onSwitchMode={switchMode}
        onExecCommand={execCommand}
        onFormatBlock={formatBlock}
        onInsertLink={insertLink}
      />

      <RichTextEditorSurface
        mode={mode}
        value={value}
        minHeight={minHeight}
        placeholder={placeholder}
        editorRef={editorRef}
        onChange={onChange}
        onVisualInput={handleInput}
      />

      <style>{EDITOR_STYLE_TEXT}</style>
    </div>
  );
};

export default RichTextEditor;
