import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, Columns3, Eraser, ImagePlus,
  IndentDecrease, IndentIncrease, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2,
  Rows3, Strikethrough, Table2, Trash2, Underline, Undo2, Unlink, type LucideIcon,
} from "lucide-react";
import { CustomSelect } from "@/shared/components";
import { EDITORIAL_HIGHLIGHTS, EDITORIAL_TEMPLATES, EDITORIAL_TEXT_COLORS } from "../editorialContent";

const headings = [
  { value: "p", label: "Đoạn văn" },
  { value: "2", label: "Tiêu đề cấp 2" },
  { value: "3", label: "Tiêu đề cấp 3" },
  { value: "4", label: "Tiêu đề cấp 4" },
];

interface Tool {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  run: () => void;
}

interface Props {
  editor: Editor;
  readOnly: boolean;
  onLink: () => void;
  onImage: () => void;
}

export function DescriptionToolbar({ editor, readOnly, onLink, onImage }: Props) {
  const [expanded, setExpanded] = useState(false);
  const chain = () => editor.chain().focus();
  const inTable = editor.isActive("table");
  const tools = (items: Tool[]) =>
    items.map(({ label, icon: Icon, active, disabled, run }) => (
      <button
        key={label}
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={active}
        disabled={readOnly || disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={run}
        className="rounded-md p-2 text-slate-300 hover:bg-slate-800 focus-visible:outline-cyan-400 aria-pressed:bg-cyan-400/15 aria-pressed:text-cyan-200 disabled:opacity-35"
      >
        <Icon aria-hidden="true" size={17} />
      </button>
    ));

  return (
    <div className="space-y-2 border-b border-slate-800 bg-slate-950/95 p-3" aria-label="Công cụ định dạng" role="group">
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="w-36 shrink-0">
          <CustomSelect
            size="sm"
            ariaLabel="Kiểu đoạn văn"
            value={String(editor.getAttributes("heading").level ?? "p")}
            options={headings}
            disabled={readOnly}
            onChange={(value) => {
              if (value === "p") chain().setParagraph().run();
              else chain().setHeading({ level: Number(value) as 2 | 3 | 4 }).run();
            }}
          />
        </div>
        <div role="group" aria-label="Kiểu chữ" className="inline-flex gap-0.5 border-x border-slate-800 px-1">
          {tools([
            { label: "In đậm", icon: Bold, active: editor.isActive("bold"), run: () => chain().toggleBold().run() },
            { label: "In nghiêng", icon: Italic, active: editor.isActive("italic"), run: () => chain().toggleItalic().run() },
            { label: "Gạch chân", icon: Underline, active: editor.isActive("underline"), run: () => chain().toggleUnderline().run() },
            { label: "Gạch ngang", icon: Strikethrough, active: editor.isActive("strike"), run: () => chain().toggleStrike().run() },
          ])}
        </div>
        <div role="group" aria-label="Danh sách" className="inline-flex gap-0.5">
          {tools([
            { label: "Danh sách gạch đầu dòng", icon: List, active: editor.isActive("bulletList"), run: () => chain().toggleBulletList().run() },
            { label: "Danh sách đánh số", icon: ListOrdered, active: editor.isActive("orderedList"), run: () => chain().toggleOrderedList().run() },
          ])}
        </div>
        <div role="group" aria-label="Hoàn tác và làm lại" className="inline-flex gap-0.5 border-x border-slate-800 px-1">
          {tools([
            { label: "Hoàn tác", icon: Undo2, disabled: !editor.can().undo(), run: () => chain().undo().run() },
            { label: "Làm lại", icon: Redo2, disabled: !editor.can().redo(), run: () => chain().redo().run() },
          ])}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-100 lg:hidden"
          aria-expanded={expanded}
          aria-controls="description-advanced-tools"
          onClick={() => setExpanded((current) => !current)}
        >
          Thêm công cụ <ChevronDown size={14} aria-hidden="true" />
        </button>
      </div>

      <div id="description-advanced-tools" className={`${expanded ? "flex" : "hidden lg:flex"} flex-wrap items-center gap-1.5 border-t border-slate-800 pt-2`}>
        <div role="group" aria-label="Căn lề và thụt dòng" className="inline-flex flex-wrap gap-0.5 border-r border-slate-800 pr-1">
          {tools([
            { label: "Căn trái", icon: AlignLeft, active: editor.isActive({ textAlign: "left" }), run: () => chain().setTextAlign("left").run() },
            { label: "Căn giữa", icon: AlignCenter, active: editor.isActive({ textAlign: "center" }), run: () => chain().setTextAlign("center").run() },
            { label: "Căn phải", icon: AlignRight, active: editor.isActive({ textAlign: "right" }), run: () => chain().setTextAlign("right").run() },
            { label: "Giảm cấp danh sách", icon: IndentDecrease, disabled: !editor.can().liftListItem("listItem"), run: () => chain().liftListItem("listItem").run() },
            { label: "Tăng cấp danh sách", icon: IndentIncrease, disabled: !editor.can().sinkListItem("listItem"), run: () => chain().sinkListItem("listItem").run() },
          ])}
        </div>
        <div className="w-32 shrink-0">
          <CustomSelect
            size="sm"
            ariaLabel="Màu chữ"
            placeholder="Màu chữ"
            value={editor.getAttributes("textStyle").color ?? ""}
            options={[{ value: "", label: "Màu mặc định" }, ...EDITORIAL_TEXT_COLORS]}
            disabled={readOnly}
            onChange={(value) => value ? chain().setColor(value).run() : chain().unsetColor().run()}
          />
        </div>
        <div className="w-32 shrink-0">
          <CustomSelect
            size="sm"
            ariaLabel="Tô nền chữ"
            placeholder="Tô nền chữ"
            value={editor.getAttributes("highlight").color ?? ""}
            options={[{ value: "", label: "Bỏ tô nền" }, ...EDITORIAL_HIGHLIGHTS]}
            disabled={readOnly}
            onChange={(value) => value ? chain().setHighlight({ color: value }).run() : chain().unsetHighlight().run()}
          />
        </div>
        <div role="group" aria-label="Chèn nội dung" className="inline-flex flex-wrap gap-0.5 border-l border-slate-800 pl-1">
          {tools([
            { label: "Trích dẫn", icon: Quote, active: editor.isActive("blockquote"), run: () => chain().toggleBlockquote().run() },
            { label: "Đường phân cách", icon: Minus, run: () => chain().setHorizontalRule().run() },
            { label: editor.isActive("link") ? "Chỉnh sửa liên kết" : "Chèn liên kết", icon: Link2, run: onLink },
            { label: "Bỏ liên kết", icon: Unlink, disabled: !editor.isActive("link"), run: () => chain().extendMarkRange("link").unsetLink().run() },
            { label: editor.isActive("editorialFigure") ? "Chỉnh sửa ảnh" : "Chèn ảnh", icon: ImagePlus, run: onImage },
            { label: "Chèn bảng", icon: Table2, disabled: inTable, run: () => chain().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run() },
            { label: "Xóa định dạng", icon: Eraser, run: () => chain().unsetAllMarks().unsetTextAlign().clearNodes().run() },
          ])}
        </div>
        <div className="w-40 shrink-0">
          <CustomSelect
            size="sm"
            ariaLabel="Chèn mẫu nội dung"
            placeholder="Chèn mẫu nội dung"
            value=""
            options={EDITORIAL_TEMPLATES.map(({ value, label }) => ({ value, label }))}
            disabled={readOnly}
            onChange={(value) => {
              const template = EDITORIAL_TEMPLATES.find((item) => item.value === value);
              if (template) chain().insertContent(template.html).run();
            }}
          />
        </div>
      </div>

      {inTable && (
        <div role="group" aria-label="Chỉnh sửa bảng" className="flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-2">
          <span className="mr-1 text-xs font-semibold text-slate-400">Bảng</span>
          {tools([
            { label: "Thêm hàng bên dưới", icon: Rows3, disabled: !editor.can().addRowAfter(), run: () => chain().addRowAfter().run() },
            { label: "Thêm cột bên phải", icon: Columns3, disabled: !editor.can().addColumnAfter(), run: () => chain().addColumnAfter().run() },
          ])}
          <button type="button" disabled={readOnly || !editor.can().deleteRow()} className="rounded-md px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-40" onClick={() => chain().deleteRow().run()}>Xóa hàng</button>
          <button type="button" disabled={readOnly || !editor.can().deleteColumn()} className="rounded-md px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-40" onClick={() => chain().deleteColumn().run()}>Xóa cột</button>
          {tools([
            { label: "Xóa bảng", icon: Trash2, disabled: !editor.can().deleteTable(), run: () => chain().deleteTable().run() },
          ])}
        </div>
      )}
    </div>
  );
}
