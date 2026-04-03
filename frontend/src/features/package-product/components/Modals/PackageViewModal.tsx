import React from "react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { ModalShell } from "./ModalShell";
import {
  AugmentedRow,
  DEFAULT_CAPACITY_LIMIT,
  formatDisplayDate,
  getCapacityAvailabilityState,
} from "../../utils/packageHelpers";

export type PackageViewModalProps = {
  open: boolean;
  row: AugmentedRow | null;
  onClose: () => void;
};

type FieldDef = {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  copyable?: boolean;
  span?: 1 | 2;
};

const CopyBtn: React.FC<{ text: string }> = ({ text }) => (
  <button
    onClick={() => navigator.clipboard?.writeText(text)}
    className="p-1 rounded text-white/15 hover:text-white/50 hover:bg-white/[0.06] transition-all"
    title="Copy"
  >
    <ClipboardDocumentIcon className="w-3.5 h-3.5" />
  </button>
);

const FieldRow: React.FC<FieldDef> = ({ label, value, mono, copyable }) => {
  const hasValue = value != null && value !== "";
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-white/35 font-medium uppercase tracking-wider whitespace-nowrap flex-shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-1.5 min-w-0 justify-end">
        {hasValue ? (
          <span
            className={`text-sm text-white/85 whitespace-nowrap overflow-hidden text-ellipsis max-w-[360px] ${
              mono ? "font-mono" : ""
            }`}
            title={String(value)}
          >
            {value}
          </span>
        ) : (
          <span className="text-sm text-white/15">—</span>
        )}
        {copyable && hasValue && <CopyBtn text={String(value)} />}
      </div>
    </div>
  );
};

const FieldGrid: React.FC<{ fields: FieldDef[] }> = ({ fields }) => {
  const rows: FieldDef[][] = [];
  let i = 0;
  while (i < fields.length) {
    if (fields[i].span === 2) {
      rows.push([fields[i]]);
      i++;
    } else if (i + 1 < fields.length && fields[i + 1].span !== 2) {
      rows.push([fields[i], fields[i + 1]]);
      i += 2;
    } else {
      rows.push([fields[i]]);
      i++;
    }
  }

  return (
    <div className="space-y-0">
      {rows.map((row, ri) => (
        <div
          key={ri}
          className={`grid gap-x-8 ${
            row.length === 2 ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {row.map((f) => (
            <FieldRow key={f.label} {...f} />
          ))}
        </div>
      ))}
    </div>
  );
};

const SectionHeader: React.FC<{
  title: string;
  badge?: string;
  accentColor: string;
}> = ({ title, badge, accentColor }) => (
  <div className="flex items-center justify-between pb-3 mb-1 border-b border-white/[0.06]">
    <div className="flex items-center gap-2.5">
      <div className={`w-1.5 h-5 rounded-full bg-${accentColor}-500`} />
      <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
    </div>
    {badge && (
      <span
        className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-${accentColor}-500/15 text-${accentColor}-400`}
      >
        {badge}
      </span>
    )}
  </div>
);

export const PackageViewModal: React.FC<PackageViewModalProps> = ({
  open,
  row,
  onClose,
}) => {
  if (!open || !row) return null;

  const hasStock = row.stockId != null;

  const username = row.informationUser ?? null;
  const password = row.informationPass ?? null;
  const backupMail = row.informationMail ?? null;
  const note = row.note ?? null;
  const expiry = formatDisplayDate(row.expired);

  const importValue =
    row.import != null && Number(row.import) > 0
      ? Number(row.import).toLocaleString("vi-VN") + " ₫"
      : null;

  const mainFields: FieldDef[] = [
    { label: "Tài khoản", value: username, copyable: true },
    { label: "Mật khẩu", value: password, mono: true, copyable: true },
    { label: "Mail / 2FA", value: backupMail, copyable: true, span: 2 },
    { label: "Nguồn", value: row.supplier },
    { label: "Giá nhập", value: importValue },
    { label: "Ngày hết hạn", value: expiry },
    { label: "Ghi chú", value: note, span: 2 },
  ];

  const showStorageSection = row.storageId != null;

  const storageFields: FieldDef[] = [
    { label: "Tài khoản", value: row.accountUser, copyable: true },
    { label: "Mật khẩu", value: row.accountPass, mono: true, copyable: true },
    { label: "Mail 2FA", value: row.accountMail, copyable: true, span: 2 },
    { label: "Ghi chú", value: row.accountNote, span: 2 },
  ];

  const capacityLimit = row.storageTotal || DEFAULT_CAPACITY_LIMIT;
  const capacityUsed = row.capacityUsed || 0;
  const remainingCapacity = capacityLimit - capacityUsed;
  const capacityRatio =
    capacityLimit > 0
      ? Math.min((remainingCapacity / capacityLimit) * 100, 100)
      : 0;
  const capacityState = getCapacityAvailabilityState(remainingCapacity, capacityLimit);
  const barColor =
    capacityState === "out"
      ? "bg-rose-500"
      : capacityState === "low"
      ? "bg-amber-500"
      : "bg-emerald-500";

  const hasTwoColumns = showStorageSection;

  return (
    <ModalShell
      open={open}
      title={`Chi Tiết Gói: ${row.package}`}
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          className="px-5 py-2 text-sm font-medium text-white/60 border border-white/[0.1] rounded-xl hover:bg-white/[0.06] hover:text-white transition-all"
        >
          Đóng
        </button>
      }
    >
      <div
        className={`grid grid-cols-1 gap-6 ${
          hasTwoColumns ? "md:grid-cols-2" : ""
        }`}
      >
        {/* Thông tin gói — merged from package_product + product_stocks */}
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
          <SectionHeader
            title="Thông tin gói"
            badge={hasStock ? `Stock #${row.stockId}` : undefined}
            accentColor="indigo"
          />
          <FieldGrid fields={mainFields} />
        </section>

        {/* Tài khoản dung lượng (from product_stocks via storage_id) */}
        {showStorageSection && (
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
            <SectionHeader
              title="Tài khoản dung lượng"
              badge={`Storage #${row.storageId}`}
              accentColor="sky"
            />
            <FieldGrid fields={storageFields} />
            <div className="mt-4 pt-4 border-t border-white/[0.04] space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-white/30">Dung lượng</span>
                <span className="text-sm text-white/80 font-semibold tabular-nums">
                  {capacityUsed} / {capacityLimit} GB
                </span>
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${capacityRatio}%` }}
                />
              </div>
              <p className="text-[11px] text-white/20">
                Trống: <span className="text-white/40">{remainingCapacity} GB</span>
              </p>
            </div>
          </section>
        )}
      </div>
    </ModalShell>
  );
};
