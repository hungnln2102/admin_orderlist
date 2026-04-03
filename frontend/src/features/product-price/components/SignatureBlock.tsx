import React from "react";
import SIGN_IMG from "@/assets/sign.png";

type SignatureBlockProps = {
  quoteDateLabel: string;
};

export const SignatureBlock: React.FC<SignatureBlockProps> = ({
  quoteDateLabel,
}) => {
  return (
    <div className="border-t border-slate-200 px-8 py-8 text-sm">
      <div className="ml-auto flex max-w-[300px] flex-col items-center text-center">
        <p className="quote-muted text-sm">
          <span className="italic">Ngày </span>
          <span className="quote-ink font-semibold">{quoteDateLabel}</span>
        </p>
        <p className="quote-ink mt-2 font-semibold">Người lập biểu</p>
        <p className="quote-muted mt-0.5 text-xs italic">
          (Ký, ghi rõ họ tên)
        </p>
        <div className="mt-3 flex min-h-[96px] items-center justify-center">
          <img
            src={SIGN_IMG}
            alt="Chữ ký"
            className="max-h-[96px] max-w-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <p className="quote-ink mt-2 font-bold">Mavryk Premium Store</p>
      </div>
      <p className="quote-system-footer quote-muted mt-8 border-t border-slate-100 px-2 py-3 text-center text-[11px] leading-relaxed">
        Tài liệu tạo từ hệ thống Mavryk Premium Store — có giá trị tham khảo
        theo thời điểm lập báo giá.
      </p>
    </div>
  );
};
