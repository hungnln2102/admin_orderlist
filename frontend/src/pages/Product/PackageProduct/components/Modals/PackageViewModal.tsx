import React from "react";
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

export const PackageViewModal: React.FC<PackageViewModalProps> = ({
  open,
  row,
  onClose,
}) => {
  if (!open || !row) return null;
  const packageDetails = [
    { label: "Tài khoản", value: row.informationUser },
    { label: "Mật khẩu", value: row.informationPass },
    { label: "Mail 2FA", value: row.informationMail },
    { label: "Ghi chú", value: row.note },
    { label: "Nguồn", value: row.supplier },
    { label: "Giá nhập", value: row.import },
    { label: "Ngày hết hạn", value: formatDisplayDate(row.expired) },
  ];
  const accountDetails = [
    { label: "Tài khoản", value: row.accountUser },
    { label: "Mật khẩu", value: row.accountPass },
    { label: "Mail 2FA", value: row.accountMail },
    { label: "Ghi chú", value: row.accountNote },
  ];
  const showAccountStorage = !!row.hasCapacityField;
  const capacityLimit = row.capacityLimit || DEFAULT_CAPACITY_LIMIT;
  const capacityUsed = row.capacityUsed || 0;
  const remainingCapacity = row.remainingCapacity || 0;
  const capacityAvailabilityRatio =
    capacityLimit > 0
      ? Math.min((remainingCapacity / capacityLimit) * 100, 100)
      : 0;
  const capacityAvailabilityState = getCapacityAvailabilityState(
    remainingCapacity,
    capacityLimit
  );
  const capacityColorClass =
    capacityAvailabilityState === "out"
      ? "bg-red-500"
      : capacityAvailabilityState === "low"
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    <ModalShell
      open={open}
      title={`Chi Tiết Gói: ${row.package}`}
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          Đóng
        </button>
      }
    >
      <div
        className={`grid grid-cols-1 gap-4 ${
          showAccountStorage ? "md:grid-cols-2" : ""
        }`}
      >
        <section className="border border-gray-200 rounded-lg p-4 space-y-4 bg-white">
          <div>
            <h3 className="text-sm font-semibold text-white">Thông tin gói</h3>
            <p className="text-xs text-white/80">
              Các trường dữ liệu được lưu cho gói này.
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            {packageDetails.map((detail) => (
              <div key={detail.label}>
                <dt className="text-[11px] uppercase tracking-wide text-white/80">
                  {detail.label}
                </dt>
                <dd className="text-sm font-medium text-white break-words">
                  {detail.value !== null &&
                  detail.value !== undefined &&
                  detail.value !== ""
                    ? detail.value
                    : "-"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        {showAccountStorage && (
          <section className="border border-gray-200 rounded-lg p-4 space-y-4 bg-white">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Tài khoản dung lượng
              </h3>
              <p className="text-xs text-white/80">
                Tổng quan về tài khoản dung lượng.
              </p>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              {accountDetails.map((detail) => (
                <div key={detail.label}>
                  <dt className="text-[11px] uppercase tracking-wide text-white/80">
                    {detail.label}
                  </dt>
                  <dd className="text-sm font-medium text-white break-words">
                    {detail.value !== null &&
                    detail.value !== undefined &&
                    detail.value !== ""
                      ? detail.value
                      : "-"}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="space-y-1">
              <div className="text-sm text-white">
                <span className="font-semibold">{capacityUsed}</span> /{" "}
                {capacityLimit} GB
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${capacityColorClass}`}
                  style={{ width: `${capacityAvailabilityRatio}%` }}
                />
              </div>
              <div className="text-xs text-white/80">
                Còn trống: {remainingCapacity} GB
              </div>
            </div>
          </section>
        )}
      </div>
    </ModalShell>
  );
};
