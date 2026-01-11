import React from "react";

type Section = {
  name: string;
  rules: string;
  description: string;
};

type ProductInfoSectionProps = {
  sections: Section[];
};

export const ProductInfoSection: React.FC<ProductInfoSectionProps> = ({
  sections,
}) => {
  const renderFallback = (
    <div>
      <p className="font-semibold">Quy Tắc</p>
      <div className="mt-1 whitespace-pre-wrap break-words">Chưa cập nhật.</div>
      <p className="font-semibold mt-3">Thông tin sản phẩm</p>
      <div className="mt-1 whitespace-pre-wrap break-words">Chưa cập nhật.</div>
    </div>
  );

  return (
    <div className="px-6 py-4 text-sm leading-6 border-b border-slate-600 space-y-4 text-white/90 print:text-black">
      {sections.length === 0
        ? renderFallback
        : sections.map((section) => (
            <div key={section.name} className="space-y-2">
              <p className="font-semibold">{section.name}</p>
              <div>
                <p className="font-semibold">Quy tắc</p>
                <div className="mt-1 whitespace-pre-wrap break-words">
                  {section.rules || "Chưa cập nhật."}
                </div>
              </div>
              <div>
                <p className="font-semibold">Thông tin sản phẩm</p>
                <div className="mt-1 whitespace-pre-wrap break-words">
                  {section.description || "Chưa cập nhật."}
                </div>
              </div>
            </div>
          ))}
      <div className="pt-2 text-sm">
        <p className="font-semibold">Mọi thông tin chi tiết có thể liên hệ:</p>
        <div className="mt-1 whitespace-pre-wrap">
          - Fanpage: Mavryk - Tài Khoản Premium
          {"\n"}- Zalo: 0378.304.963
          {"\n"}- Telegram: @hung_culi
        </div>
      </div>
    </div>
  );
};
