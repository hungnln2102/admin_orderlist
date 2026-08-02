import type React from "react";
import {
  BLOCK_FORMAT_OPTIONS,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  TOOLBAR_SELECT_CLASS,
} from "./constants";
import type { EditorMode } from "./types";
import { RichTextEditorToolbarActions } from "./RichTextEditorToolbarActions";

type RichTextEditorToolbarProps = {
  label: string;
  mode: EditorMode;
  onSwitchMode: (mode: EditorMode) => void;
  onExecCommand: (command: string, commandValue?: string) => void;
  onFormatBlock: (tag: string) => void;
  onInsertLink: () => void;
};

const RichTextEditorToolbar: React.FC<RichTextEditorToolbarProps> = ({
  label,
  mode,
  onSwitchMode,
  onExecCommand,
  onFormatBlock,
  onInsertLink,
}) => {
  const isHtmlMode = mode === "html";

  const handleSelectValue = (
    event: React.ChangeEvent<HTMLSelectElement>,
    callback: (value: string) => void
  ) => {
    const selected = event.target.value;
    if (!selected) return;
    callback(selected);
    event.target.value = "";
  };

  return (
    <div className="product-edit-editor__toolbar">
      <RichTextEditorToolbarActions
        label={label}
        mode={mode}
        isHtmlMode={isHtmlMode}
        onSwitchMode={onSwitchMode}
        onExecCommand={onExecCommand}
        onFormatBlock={onFormatBlock}
        onInsertLink={onInsertLink}
      />

      <div className="product-edit-editor__toolbar-row product-edit-editor__toolbar-row--fields">
        <select
          onChange={(event) => handleSelectValue(event, onFormatBlock)}
          className={`${TOOLBAR_SELECT_CLASS} product-edit-editor__select--kind`}
          defaultValue=""
          disabled={isHtmlMode}
        >
          <option value="" disabled>
            Kiểu
          </option>
          {BLOCK_FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          onChange={(event) =>
            handleSelectValue(event, (value) => onExecCommand("fontName", value))
          }
          className={`${TOOLBAR_SELECT_CLASS} product-edit-editor__select--font`}
          defaultValue=""
          disabled={isHtmlMode}
        >
          <option value="" disabled>
            Phông
          </option>
          {FONT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          onChange={(event) =>
            handleSelectValue(event, (value) => onExecCommand("fontSize", value))
          }
          className={`${TOOLBAR_SELECT_CLASS} product-edit-editor__select--size`}
          defaultValue=""
          disabled={isHtmlMode}
        >
          <option value="" disabled>
            Cỡ chữ
          </option>
          {FONT_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default RichTextEditorToolbar;
