import React from "react";
import SIGN_IMG from "../../../../assets/sign.png";

export const SignatureBlock: React.FC = () => {
  return (
    <div className="flex justify-center px-6 py-8 text-sm text-white print:text-black">
      <div className="px-6 py-4 space-y-2 min-w-[280px] max-w-md text-center">
        <p className="font-semibold underline underline-offset-2">
          Mavryk Premium Store
        </p>
        <p className="text-[12px] italic text-white/80 print:text-black">
          (Ký, ghi rõ họ tên)
        </p>
        <div className="min-h-[110px] flex items-center justify-center">
          <img
            src={SIGN_IMG}
            alt="Chữ ký"
            className="max-h-[110px] max-w-[260px]"
            style={{ objectFit: "contain" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      </div>
    </div>
  );
};
