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
      <p className="font-semibold">Quy Tac</p>
      <div className="mt-1 whitespace-pre-wrap break-words">Chua cap nhat.</div>
      <p className="font-semibold mt-3">Thong tin san pham</p>
      <div className="mt-1 whitespace-pre-wrap break-words">Chua cap nhat.</div>
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
                <p className="font-semibold">Quy Tac</p>
                <div className="mt-1 whitespace-pre-wrap break-words">
                  {section.rules || "Chua cap nhat."}
                </div>
              </div>
              <div>
                <p className="font-semibold">Thong tin san pham</p>
                <div className="mt-1 whitespace-pre-wrap break-words">
                  {section.description || "Chua cap nhat."}
                </div>
              </div>
            </div>
          ))}
      <div className="pt-2 text-sm">
        <p className="font-semibold">Moi thong tin chi tiet co the lien he:</p>
        <div className="mt-1 whitespace-pre-wrap">
          - Fanpage: Mavryk - Tai Khoan Premium
          {"\n"}- Zalo: 0378.304.963
          {"\n"}- Telegram: @hung_culi
        </div>
      </div>
    </div>
  );
};
