export interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  helperText?: string;
}

export type EditorMode = "visual" | "html";
