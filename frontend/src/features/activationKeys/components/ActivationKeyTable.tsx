import React, { useState } from "react";
import {
  Copy,
  Check,
  Ban,
  Trash2,
  ExternalLink,
  ShieldCheck,
  User,
  Clock,
  Sparkles,
} from "lucide-react";
import { ActivationKeyItem } from "../types";

interface Props {
  items: ActivationKeyItem[];
  loading: boolean;
  onRevoke: (item: ActivationKeyItem) => void;
  onDelete: (item: ActivationKeyItem) => void;
  onCopyText: (text: string, label: string) => void;
}

export const ActivationKeyTable: React.FC<Props> = ({
  items,
  loading,
  onRevoke,
  onDelete,
  onCopyText,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, keyId: string, label: string) => {
    onCopyText(text, label);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Khả Dụng
          </span>
        );
      case "ACTIVATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Check className="w-3 h-3" />
            Đã Kích Hoạt
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <Ban className="w-3 h-3" />
            Đã Thu Hồi
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            Hết Hạn
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center text-slate-400 backdrop-blur-xl">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm">Đang tải danh sách mã kích hoạt...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center text-slate-400 backdrop-blur-xl">
        <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-base font-medium text-slate-300">Chưa có mã kích hoạt nào</p>
        <p className="text-xs text-slate-500 mt-1">
          Bấm nút "Tạo Mã Key" phía trên để tạo mới mã kích hoạt cho khách hàng.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-slate-900/60 rounded-2xl border border-slate-800 backdrop-blur-xl">
      <table className="w-full text-left text-xs sm:text-sm text-slate-300">
        <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[11px] tracking-wider font-semibold">
          <tr>
            <th className="py-3.5 px-4">Mã Key</th>
            <th className="py-3.5 px-4">Sản Phẩm</th>
            <th className="py-3.5 px-4">Đơn Hàng</th>
            <th className="py-3.5 px-4">Trạng Thái</th>
            <th className="py-3.5 px-4">Tài Khoản / Slot Đã Cấp</th>
            <th className="py-3.5 px-4">Khách Hàng / Ghi Chú</th>
            <th className="py-3.5 px-4">Thời Gian</th>
            <th className="py-3.5 px-4 text-right">Thao Tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {items.map((item) => {
            const isCopied = copiedKey === `key_${item.id}`;

            return (
              <tr
                key={item.id}
                className="hover:bg-slate-800/40 transition-colors group"
              >
                {/* Mã Key */}
                <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded-lg border border-cyan-800/40">
                      {item.key_code}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(item.key_code, `key_${item.id}`, "Đã sao chép Mã Key!")
                      }
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Sao chép mã Key"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </td>

                {/* Sản Phẩm */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="font-semibold text-slate-200">
                    {item.product_name || `SP #${item.product_name_id}`}
                  </span>
                </td>

                {/* Đơn Hàng */}
                <td className="py-3 px-4 whitespace-nowrap">
                  {item.id_order ? (
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      #{item.id_order}
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>

                {/* Trạng Thái */}
                <td className="py-3 px-4 whitespace-nowrap">
                  {getStatusBadge(item.status)}
                </td>

                {/* Tài Khoản / Slot Đã Cấp */}
                <td className="py-3 px-4">
                  {item.assigned_account ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-400 font-bold">
                        <span className="truncate max-w-[200px]" title={item.assigned_account}>
                          {item.assigned_account}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              item.assigned_account!,
                              `acc_${item.id}`,
                              "Đã sao chép tài khoản!"
                            )
                          }
                          className="text-slate-400 hover:text-emerald-300"
                          title="Sao chép email"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      {item.slot_index && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Slot #{item.slot_index}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs italic">Chưa cấp phát</span>
                  )}
                </td>

                {/* Khách Hàng / Ghi Chú */}
                <td className="py-3 px-4">
                  <div className="space-y-0.5 max-w-[200px]">
                    {item.customer_info && (
                      <div className="flex items-center gap-1 text-xs text-slate-300 font-medium truncate">
                        <User className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{item.customer_info}</span>
                      </div>
                    )}
                    {item.note && (
                      <p className="text-[11px] text-slate-500 truncate" title={item.note}>
                        {item.note}
                      </p>
                    )}
                    {!item.customer_info && !item.note && (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </td>

                {/* Thời Gian */}
                <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-400">
                  <div className="space-y-0.5">
                    <div>
                      Tạo: <span className="text-slate-300">{formatDate(item.created_at)}</span>
                    </div>
                    {item.activated_at && (
                      <div className="text-purple-400 text-[11px]">
                        Dùng: {formatDate(item.activated_at)}
                      </div>
                    )}
                  </div>
                </td>

                {/* Thao Tác */}
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Thu hồi key */}
                    {item.status === "AVAILABLE" && (
                      <button
                        type="button"
                        onClick={() => onRevoke(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Thu hồi mã key này"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}

                    {/* Xóa key chưa kích hoạt */}
                    {item.status !== "ACTIVATED" && (
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Xóa mã key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

