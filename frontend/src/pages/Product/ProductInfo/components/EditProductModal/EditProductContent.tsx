import React from "react";
import { EditorContext } from "./types";
import { RichTextSection } from "./RichTextSection";

type EditProductContentLabels = {
  rules: string;
  description: string;
};

type EditProductContentProps = {
  labels: EditProductContentLabels;
  rulesEditorRef: React.RefObject<HTMLDivElement>;
  descriptionEditorRef: React.RefObject<HTMLDivElement>;
  rulesEditorKey: string;
  descriptionEditorKey: string;
  renderToolbar: (context: EditorContext) => React.ReactNode;
  onFocusEditor: (context: EditorContext) => void;
  onSyncEditor: (context: EditorContext, element: HTMLDivElement | null) => void;
};

export const EditProductContent: React.FC<EditProductContentProps> = ({
  labels,
  rulesEditorRef,
  descriptionEditorRef,
  rulesEditorKey,
  descriptionEditorKey,
  renderToolbar,
  onFocusEditor,
  onSyncEditor,
}) => (
  <div className="space-y-4 lg:col-span-3">
    <RichTextSection
      label={labels.rules}
      toolbar={renderToolbar("rules")}
      editorRef={rulesEditorRef}
      editorKey={rulesEditorKey}
      context="rules"
      onFocusEditor={onFocusEditor}
      onSyncEditor={onSyncEditor}
    />

    <RichTextSection
      label={labels.description}
      toolbar={renderToolbar("description")}
      editorRef={descriptionEditorRef}
      editorKey={descriptionEditorKey}
      context="description"
      onFocusEditor={onFocusEditor}
      onSyncEditor={onSyncEditor}
    />
  </div>
);
