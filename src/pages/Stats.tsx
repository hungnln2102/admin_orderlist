import React from "react";

const statGroups = [
  {
    title: "Hiệu suất chung",
    rows: [
      { label: "Đơn mới hôm nay", value: "—" },
      { label: "Gói còn slot thấp", value: "—" },
      { label: "Gói đã hết slot", value: "—" },
    ],
  },
  {
    title: "Tài chính",
    rows: [
      { label: "Tổng giá trị đơn", value: "—" },
      { label: "Giá trị trung bình", value: "—" },
      { label: "Đơn cần gia hạn", value: "—" },
    ],
  },
];

export default function Stats() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Thống Kê</h1>
          <p className="text-sm text-white/70">
            Tổng hợp số liệu hệ thống (đang chờ kết nối dữ liệu thực).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statGroups.map((group) => (
          <div
            key={group.title}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-lg p-5 text-white"
          >
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <div className="mt-3 space-y-2">
              {group.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between text-sm text-white/80 border-b border-white/5 pb-2 last:border-b-0"
                >
                  <span>{row.label}</span>
                  <span className="font-semibold text-white">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
