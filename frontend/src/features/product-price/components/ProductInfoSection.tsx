import React from "react";
import type { QuoteProductDescSection } from "../types";

type ProductInfoSectionProps = {
  sections: QuoteProductDescSection[];
};

export const ProductInfoSection: React.FC<ProductInfoSectionProps> = ({
  sections,
}) => {
  const block = "border-t border-slate-200 pt-4 first:border-t-0 first:pt-0";

  const renderFallback = (
    <div className={`${block} text-sm`}>
      <p className="quote-ink font-semibold">Quy tắc</p>
      <p className="quote-muted mt-1 whitespace-pre-wrap leading-relaxed">
        Chưa cập nhật.
      </p>
      <p className="quote-ink mt-4 font-semibold">Thông tin sản phẩm</p>
      <p className="quote-muted mt-1 whitespace-pre-wrap leading-relaxed">
        Chưa cập nhật.
      </p>
    </div>
  );

  return (
    <div className="space-y-4 border-t border-slate-200 px-8 py-5 text-sm">

      {sections.length === 0
        ? renderFallback
        : sections.map((section) => (
            <div key={section.name} className={block}>
              <p className="quote-ink font-semibold">{section.name}</p>
              <p className="quote-ink mt-3 text-sm font-medium">Quy tắc</p>
              <p className="quote-muted mt-1 whitespace-pre-wrap leading-relaxed">
                {section.rules || "Chưa cập nhật."}
              </p>
              <p className="quote-ink mt-3 text-sm font-medium">
                Thông tin sản phẩm
              </p>
              <p className="quote-muted mt-1 whitespace-pre-wrap leading-relaxed">
                {section.description || "Chưa cập nhật."}
              </p>
            </div>
          ))}

      <div className={`${block} !border-t !pt-4`}>
        <p className="quote-ink font-semibold">Liên hệ</p>
        <ul className="quote-muted mt-2 list-none space-y-1 pl-0">
          <li>Fanpage: Mavryk - Tài Khoản Premium</li>
          <li>Zalo: 0378.304.963</li>
          <li>Telegram: @hung_culi</li>
        </ul>
      </div>
    </div>
  );
};
