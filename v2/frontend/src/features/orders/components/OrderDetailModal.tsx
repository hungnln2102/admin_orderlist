import React, { useState } from "react";
import { X, Eye, Calendar, User, DollarSign, Clock, ShoppingBag, QrCode, Copy, Check, CreditCard, FileText } from "lucide-react";
import {
  Order,
  CatalogProduct,
  calculateRemainingDays,
  calculateRemainingValue,
  formatDateDisplay,
  getDisplayProductName,
  getOrderPrefixConfig,
} from "../types";
import { renderStatusBadge } from "./StatusBadge";

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  productsCatalog: CatalogProduct[];
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  productsCatalog,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const prefixConfig = getOrderPrefixConfig(order.id_order);
  const displayProduct = getDisplayProductName(order.id_product, productsCatalog, order.information_order);
  const remainingDays = calculateRemainingDays(order);
  const remainingValue = calculateRemainingValue(order);

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyQrImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopiedField("qr_image");
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedField("qr_image");
        setTimeout(() => setCopiedField(null), 2000);
      } catch (e) {
        console.error("Copy QR failed:", e);
      }
    }
  };

  const amountToPay = order.bank_info?.type === "supplier" ? Number(order.cost || order.price || 0) : Number(order.price || 0);
  const vietQrUrl = order.vietqr_url || (order.id_order ? `https://img.vietqr.io/image/MB-970422-compact2.png?amount=${amountToPay}` : null);
  const fmt = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0a1225] border border-slate-700/50 w-full max-w-[640px] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-slate-900/80 to-[#0a1225]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Eye className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">Chi Tiết Đơn Hàng</h3>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${prefixConfig.badgeBg} ${prefixConfig.badgeText} ${prefixConfig.badgeBorder} font-mono`}
                >
                  #{order.id_order}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Thông tin khách hàng, sản phẩm, tài chính & thanh toán</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-4 overflow-y-auto custom-scrollbar space-y-3 text-xs">

          {/* ─ Product Title Banner ─ */}
          {displayProduct && (
            <div className="bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Sản Phẩm:</span>
                <span className="text-cyan-300 font-bold text-[13px]">{displayProduct}</span>
              </div>
            </div>
          )}

          {/* ─ Customer + Product Info (2 columns on desktop) ─ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customer */}
            <div className="bg-slate-900/40 px-4 py-3 rounded-xl border border-slate-800/60 space-y-2">
              <div className="font-bold text-cyan-400 text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                <User className="w-3 h-3" /> Khách Hàng
              </div>
              <div className="space-y-1">
                <div className="text-white font-bold text-[13px]">{order.customer || "Khách Vãng Lai"}</div>
                <div className="text-slate-400 text-[11px]">{order.contact || "Chưa có liên hệ"}</div>
              </div>
            </div>

            {/* Product Info & Slot */}
            <div className="bg-slate-900/40 px-4 py-3 rounded-xl border border-slate-800/60 space-y-2">
              <div className="font-bold text-cyan-400 text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                <ShoppingBag className="w-3 h-3" /> Thông Tin Sản Phẩm
              </div>
              <div className="space-y-1">
                {order.information_order ? (
                  <div className="text-cyan-300 font-bold text-[13px] leading-tight">{order.information_order}</div>
                ) : (
                  <div className="text-slate-500 text-[11px]">—</div>
                )}
                {order.slot && (
                  <div className="inline-flex items-center gap-1 mt-1">
                    <span className="text-[9px] text-slate-500">Slot:</span>
                    <span className="font-mono text-cyan-400 text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/15 px-1.5 py-0.5 rounded">
                      {order.slot}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─ Status & Dates ─ */}
          <div className="bg-slate-900/40 px-4 py-3 rounded-xl border border-slate-800/60 space-y-2.5">
            <div className="font-bold text-cyan-400 text-[10px] uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Trạng Thái & Thời Hạn
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-block">{renderStatusBadge(order.status)}</div>
              <div className="text-slate-400 text-[11px]">
                Thời hạn: <span className="text-white font-bold">{order.days || 365} ngày</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/40 px-3 py-2 rounded-lg border border-slate-800/40">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Ngày Đặt</div>
                <div className="font-bold text-white text-[11px] mt-0.5">{formatDateDisplay(order.order_date || order.created_at)}</div>
              </div>
              <div className="bg-slate-950/40 px-3 py-2 rounded-lg border border-slate-800/40">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Hết Hạn</div>
                <div className="font-bold text-amber-400 text-[11px] mt-0.5">{formatDateDisplay(order.expired_at)}</div>
              </div>
            </div>
            {remainingDays !== 0 && (
              <div
                className={`px-3 py-2 rounded-lg border text-[11px] font-bold flex items-center gap-2 ${
                  remainingDays > 0
                    ? "bg-amber-500/8 border-amber-500/15 text-amber-300"
                    : "bg-rose-500/8 border-rose-500/15 text-rose-300"
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {remainingDays > 0
                    ? `Còn ${remainingDays} ngày sử dụng`
                    : `Quá hạn ${Math.abs(remainingDays)} ngày`}
                </span>
              </div>
            )}
          </div>

          {/* ─ VietQR Payment ─ */}
          {vietQrUrl && (
            <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-slate-900/50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-cyan-500/10 flex items-center justify-between">
                <div className="font-bold text-cyan-400 text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" /> Mã QR Thanh Toán (VietQR)
                </div>
                <span className="text-[9px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                  {order.bank_info?.type === "supplier" ? "Thanh toán NCC" : "Khách quét CK"}
                </span>
              </div>
              <div className="p-4 flex flex-col items-center justify-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-lg shadow-black/40 border border-slate-700/50">
                  <img
                    src={vietQrUrl}
                    alt={`QR #${order.id_order}`}
                    className="w-[180px] h-[180px] object-contain rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyQrImage(vietQrUrl)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400/50 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
                >
                  {copiedField === "qr_image" ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Đã sao chép QR!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-cyan-400" />
                      <span>Sao chép Ảnh QR</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─ Note ─ */}
          {order.note && (
            <div className="bg-slate-900/40 px-4 py-3 rounded-xl border border-slate-800/60 space-y-1.5">
              <div className="font-bold text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Ghi Chú
              </div>
              <p className="text-slate-300 text-[11px] whitespace-pre-wrap leading-relaxed">{order.note}</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-slate-800/60 flex justify-end bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
