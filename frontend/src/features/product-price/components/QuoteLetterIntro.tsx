import React from "react";

type QuoteLetterIntroProps = {
  greetingAddressee: string;
  contact: string;
};

export const QuoteLetterIntro: React.FC<QuoteLetterIntroProps> = ({
  greetingAddressee,
  contact,
}) => (
  <div className="space-y-3 px-8 py-4 text-sm">
    <p>
      <span className="quote-muted">Kính gửi:</span>{" "}
      <strong className="quote-ink">{greetingAddressee}</strong>
    </p>
    {contact ? (
      <p>
        <span className="quote-muted">Thông tin liên hệ:</span>{" "}
        <span className="quote-ink font-medium">{contact}</span>
      </p>
    ) : null}
    <div className="space-y-2 border-t border-slate-100 pt-3 text-justify leading-relaxed">
      <p>
        <span className="font-semibold quote-ink">Mavryk Premium Store</span> xin
        trân trọng kính chào{" "}
        <span className="font-semibold quote-ink">{greetingAddressee}</span>.
        Trước hết, chúng tôi xin cảm ơn Quý khách đã quan tâm tới sản phẩm và
        dịch vụ của cửa hàng. Theo nhu cầu của Quý khách, chúng tôi xin gửi bảng
        báo giá chi tiết như sau:
      </p>
    </div>
  </div>
);
