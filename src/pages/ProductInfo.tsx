import React, { useRef } from "react";
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  policy: string;
  description: string;
};

const mockProducts: ProductRow[] = [
  {
    id: "p1",
    name: "Ao Thun Nam Cotton Cao Cap",
    sku: "#SP00123",
    category: "Thoi Trang Nam > Ao Thun",
    policy: "Bao hanh 6 thang. Doi tra trong 7 ngay.",
    description:
      "Chat lieu 100% cotton, mem mai, thoang khi, thich hop di lam va di choi.",
  },
  {
    id: "p2",
    name: "Smartphone X",
    sku: "#SP00124",
    category: "Dien Thoai > Smartphone",
    policy: "Bao hanh 12 thang. Doi tra trong 7 ngay.",
    description: "Chip moi, man AMOLED 120Hz, pin 5000mAh, sac nhanh.",
  },
  {
    id: "p3",
    name: "Ban Phim Co",
    sku: "#SP00123",
    category: "Phu Kien > Ban Phim",
    policy: "Bao hanh 6 thang. Doi tra trong 7 ngay.",
    description:
      "Switch brown, day kim loai, led RGB, phu hop gaming va van phong.",
  },
  {
    id: "p4",
    name: "Ao Thun Nam Cotton Cao Cap",
    sku: "#SP00123",
    category: "Thoi Trang Nam > Ao Thun",
    policy: "Bao hanh 6 thang. Doi tra trong 7 ngay.",
    description:
      "Chat lieu 100% cotton, mem mai, thoang khi, form regular fit.",
  },
  {
    id: "p5",
    name: "Smartphone X",
    sku: "#SP00124",
    category: "Dien Thoai > Smartphone",
    policy: "Bao hanh 12 thang. Doi tra trong 7 ngay.",
    description: "Camera 50MP, quay 4K, sac nhanh 65W, loa stereo.",
  },
  {
    id: "p6",
    name: "Ban Phim Co",
    sku: "#SP00125",
    category: "Phu Kien > Ban Phim",
    policy: "Bao hanh 6 thang. Doi tra trong 7 ngay.",
    description: "Layout 87 keys, hot-swap switch, co day USB-C.",
  },
  {
    id: "p7",
    name: "Ao Thun Nam Cotton Cao Cap",
    sku: "#SP00123",
    category: "Thoi Trang Nam > Ao Thun",
    policy: "Bao hanh 6 thang. Doi tra trong 7 ngay.",
    description:
      "Chat lieu 100% cotton, mem mai, thoang khi, thich hop di lam va di choi.",
  },
];

export default function ProductInfo() {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Selected file:", file.name);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-white">Thong Tin San Pham</h1>
        <p className="text-sm text-white/70">
          Quan ly danh sach san pham, quy tac va mo ta hien co.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-xl">
          <input
            type="text"
            placeholder="Tim kiem theo ten, SKU hoac danh muc..."
            className="w-full bg-[#0f1729] border border-white/10 text-white placeholder:text-white/50 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 text-sm">
            🔍
          </span>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow">
          Them San Pham Moi
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0b1220] shadow-xl overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">San Pham</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/90">
            <thead className="bg-white/5 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Anh</th>
                <th className="px-4 py-3 text-left font-semibold">San Pham</th>
                <th className="px-4 py-3 text-left font-semibold">Loai San Pham</th>
                <th className="px-4 py-3 text-left font-semibold">Quy Tac</th>
                <th className="px-4 py-3 text-left font-semibold">Noi Dung</th>
                <th className="px-4 py-3 text-left font-semibold">Thao Tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {mockProducts.map((item) => {
                const initials = item.name.slice(0, 2).toUpperCase();
                const isExpanded = expandedId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`hover:bg-white/5 cursor-pointer ${
                        isExpanded ? "bg-white/5" : ""
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="w-12 h-12 rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                          {initials}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white">{item.category}</td>
                    <td className="px-4 py-3 text-white/80">{item.policy}</td>
                    <td className="px-4 py-3 text-white/80">{item.description}</td>
                    <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                        <button
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                          title="Xem"
                        >
                          <EyeIcon className="h-5 w-5 text-blue-400" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                          title="Sua"
                        >
                          <PencilSquareIcon className="h-5 w-5 text-green-400" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                          title="Xoa"
                        >
                          <TrashIcon className="h-5 w-5 text-red-400" />
                        </button>
                    </td>
                  </tr>
                    {isExpanded && (
                      <tr className="bg-white/5">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 mb-3">
                            <p className="text-sm font-semibold text-white">Thong tin chi tiet</p>
                            <p className="mt-2 text-white/80 leading-relaxed">
                              Adobe Goi 1PC - Ghi chu chi tiet ve goi san pham, huong dan su dung,
                              va cac thong tin bo sung khac.
                            </p>
                          </div>
                          <div className="flex flex-col md:flex-row gap-4">
                          <div className="w-full md:w-64 rounded-lg border border-white/10 bg-white/5 p-4 flex flex-col items-center justify-center text-white">
                            <div className="w-32 h-32 rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
                              {initials}
                            </div>
                            <div className="mt-3 text-center space-y-1">
                                <button
                                  type="button"
                                  onClick={handleChooseFile}
                                  className="text-sm font-semibold text-blue-200 hover:text-white transition-colors border border-white/20 rounded-full px-3 py-1 bg-white/5"
                                >
                                  Choose file
                                </button>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleFileSelected}
                                />
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                              <p className="text-sm font-semibold text-white">Quy tac bao hanh</p>
                              <p className="mt-2 text-white/80 leading-relaxed">{item.policy}</p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                              <p className="text-sm font-semibold text-white">Thong tin san pham</p>
                              <p className="mt-2 text-white/80 leading-relaxed">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-white/70 text-sm">
          <div className="space-x-2">
            <button className="px-2 py-1 rounded bg-white/5 hover:bg-white/10">{"<<"}</button>
            <button className="px-2 py-1 rounded bg-white/5 hover:bg-white/10">{"<"}</button>
            <button className="px-3 py-1 rounded bg-blue-600 text-white font-semibold">1</button>
            <button className="px-2 py-1 rounded bg-white/5 hover:bg-white/10">{">"}</button>
            <button className="px-2 py-1 rounded bg-white/5 hover:bg-white/10">{">>"}</button>
          </div>
          <span>1-7 trong 7</span>
        </div>
      </div>
    </div>
  );
}
