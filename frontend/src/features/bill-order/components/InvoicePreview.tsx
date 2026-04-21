import React, { useMemo } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import {
  COMPANY_INFO,
  INVOICE_FONT_STACK,
  InvoiceForm,
  InvoiceLine,
  formatCurrency,
} from "../helpers";
import signImage from "@/assets/sign.png";

type InvoicePreviewProps = {
  form: InvoiceForm;
  invoiceLines: InvoiceLine[];
  totals: { subtotal: number };
  dateDisplay: string;
  invoiceCodesDisplay: string;
  orderStatusDisplay: string;
  onDownload: () => void;
};

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  form,
  invoiceLines,
  totals,
  dateDisplay,
  invoiceCodesDisplay,
  orderStatusDisplay,
  onDownload,
}) => {
  const { productTotal, discountTotal, subTotal } = useMemo(() => {
    const pt = invoiceLines.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const sub = totals.subtotal;
    return {
      productTotal: pt,
      discountTotal: Math.max(0, pt - sub),
      subTotal: sub,
    };
  }, [invoiceLines, totals.subtotal]);

  const printStyles = `
    #invoice-preview,
    #invoice-preview * {
      font-family: ${INVOICE_FONT_STACK};
    }
    @media print {
      @page { size: A4; margin: 0; }
      html, body { margin: 0; padding: 0; background: white !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .app-aurora { background: white !important; }
      .app-aurora .bg-white,
      .app-aurora .bg-white\\/90,
      .app-aurora .bg-white\\/80,
      .app-aurora .bg-white\\/70,
      .app-aurora .bg-white\\/60,
      .app-aurora .bg-gray-50 {
        background: white !important;
        box-shadow: none !important;
        border: 1px solid transparent !important;
        color: #111 !important;
      }
      .app-aurora input,
      .app-aurora textarea,
      .app-aurora select {
        background: white !important;
        color: #111 !important;
        border-color: #ccc !important;
      }
      body * { visibility: hidden !important; }
      #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
      #invoice-print-area {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
      }
      .print-target { display: block !important; }
      .print-hidden { display: none !important; }
      #invoice-print-area {
        display: block !important;
        margin: 0 auto !important;
        padding: 0 !important;
        width: 100% !important;
        background: white !important;
      }
      #invoice-preview {
        box-sizing: border-box !important;
        box-shadow: none !important;
        max-width: 210mm !important;
        margin: 0 auto !important;
        padding: 24px !important;
        page-break-inside: avoid !important;
        background: #ffffff !important;
        color: #111827 !important;
        border: 1px solid #cbd5e1 !important;
      }
      #invoice-preview .inv-muted { color: #334155 !important; }
      #invoice-preview .inv-heading { color: #0f172a !important; }
      #invoice-preview .inv-border { border-color: #64748b !important; }
      #invoice-preview .inv-table-head { background: #f1f5f9 !important; color: #0f172a !important; }
      #invoice-preview .inv-table-cell { border-color: #94a3b8 !important; color: #1e293b !important; }
      #invoice-preview .inv-link-name { color: #1d4ed8 !important; }
      #invoice-preview,
      #invoice-preview * {
        font-family: ${INVOICE_FONT_STACK} !important;
      }
      #invoice-preview .invoice-signature img {
        max-width: 200px !important;
        height: auto !important;
        object-fit: contain !important;
        filter: none !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;

  const pad = "48px";
  const border = "#334155";

  return (
    <div className="rounded-2xl bg-white shadow-md border border-slate-200 print-target">
      <div className="border-b border-slate-200 px-6 py-4 print-hidden">
        <h2 className="text-lg font-semibold text-white">
          Xem trước & tải về
        </h2>
      </div>

      <div className="p-6">
        <style>{printStyles}</style>
        <div id="invoice-print-area">
          <div
            id="invoice-preview"
            className="mx-auto max-w-[980px] border border-[#1e3356] inv-shell"
            style={{
              fontFamily: INVOICE_FONT_STACK,
              background: "linear-gradient(180deg,#07122b 0%, #020b1d 100%)",
              color: "#e5e7eb",
            }}
          >
            <div style={{ padding: `40px ${pad} 24px`, textAlign: "center" }}>
              <h1
                className="inv-heading"
                style={{
                  margin: 0,
                  fontSize: 28,
                  lineHeight: "36px",
                  fontWeight: 700,
                  color: "#f8fafc",
                  textTransform: "uppercase",
                }}
              >
                {COMPANY_INFO.name}
              </h1>
              <p className="inv-muted" style={{ margin: "12px 0 0", fontSize: 14, lineHeight: "24px", color: "#cbd5e1" }}>
                Địa chỉ: {COMPANY_INFO.address}
              </p>
              <p className="inv-muted" style={{ margin: "4px 0 0", fontSize: 14, lineHeight: "24px", color: "#cbd5e1" }}>
                Điện thoại: {COMPANY_INFO.phone}
              </p>
              <p className="inv-muted" style={{ margin: "4px 0 0", fontSize: 14, lineHeight: "24px", color: "#cbd5e1" }}>
                Ngân hàng: {COMPANY_INFO.bank}
              </p>
              <p className="inv-muted" style={{ margin: "4px 0 0", fontSize: 14, lineHeight: "24px", color: "#cbd5e1" }}>
                STK: {COMPANY_INFO.accountNumber}
              </p>
              <p className="inv-muted" style={{ margin: "4px 0 0", fontSize: 14, lineHeight: "24px", color: "#cbd5e1" }}>
                Tên người nhận: NGO LE NGOC HUNG
              </p>
            </div>

            <div style={{ padding: `0 ${pad}` }}>
              <div className="inv-border" style={{ borderTop: "1px solid #64748b" }} />
            </div>

            <div style={{ padding: `20px ${pad} 10px`, textAlign: "center" }}>
              <h2
                className="inv-heading"
                style={{
                  margin: 0,
                  fontSize: 26,
                  lineHeight: "34px",
                  fontWeight: 700,
                  color: "#f8fafc",
                  textTransform: "uppercase",
                }}
              >
                Hóa đơn mua hàng
              </h2>
              <p className="inv-muted" style={{ margin: "8px 0 0", fontSize: 15, lineHeight: "22px", color: "#cbd5e1" }}>
                Mã hóa đơn: {invoiceCodesDisplay}
              </p>
              <p className="inv-muted" style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "22px", color: "#cbd5e1" }}>
                Ngày: {dateDisplay}
              </p>
            </div>

            <div style={{ padding: `10px ${pad} 0` }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: "26px", color: "#e5e7eb" }}>
                Xin chào <strong>{form.customerName?.trim() || "Quý khách"}</strong>,
              </p>
              <p className="inv-muted" style={{ margin: "12px 0 0", fontSize: 15, lineHeight: "26px", color: "#cbd5e1" }}>
                Cảm ơn Quý khách đã mua hàng tại <strong>{COMPANY_INFO.name}</strong>.
              </p>
              <p className="inv-muted" style={{ margin: "12px 0 0", fontSize: 15, lineHeight: "26px", color: "#cbd5e1" }}>
                Dưới đây là thông tin hóa đơn và chi tiết sản phẩm Quý khách đã mua.
              </p>
            </div>

            <div style={{ padding: `22px ${pad} 24px` }}>
              <div style={{ fontSize: 15, lineHeight: "28px", color: "#e5e7eb" }}>
                <strong>Khách hàng:</strong> {form.customerName?.trim() || "—"}
                <br />
                <strong>Địa chỉ:</strong> {form.address?.trim() || "—"}
                <br />
                <strong>SDT:</strong> {form.phone?.trim() || "—"} &nbsp;&nbsp;&nbsp;
                <strong>Email:</strong> {form.customerEmail?.trim() || "—"}
                <br />
                <strong>Phương thức thanh toán:</strong> {form.paymentMethod?.trim() || "—"}
                <br />
                <strong>Fax:</strong> {form.fax?.trim() || "—"} &nbsp;&nbsp;&nbsp;
                <strong>Mã số Thuế:</strong> {form.taxCode?.trim() || "—"}
              </div>
            </div>

            <div style={{ padding: `0 ${pad}` }}>
              <table
                className="inv-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: `1px solid ${border}`,
                }}
              >
                <thead>
                  <tr className="inv-table-head" style={{ backgroundColor: "rgba(15,23,42,0.45)" }}>
                    <th className="inv-table-cell" align="left" style={{ padding: "14px 12px", border: `1px solid ${border}`, fontSize: 14, color: "#f8fafc" }}>
                      Tên sản phẩm / Dịch vụ
                    </th>
                    <th className="inv-table-cell" align="center" style={{ padding: "14px 12px", border: `1px solid ${border}`, fontSize: 14, color: "#f8fafc" }}>
                      Đơn giá
                    </th>
                    <th className="inv-table-cell" align="center" style={{ padding: "14px 12px", border: `1px solid ${border}`, fontSize: 14, color: "#f8fafc" }}>
                      SL
                    </th>
                    <th className="inv-table-cell" align="center" style={{ padding: "14px 12px", border: `1px solid ${border}`, fontSize: 14, color: "#f8fafc" }}>
                      Chiết khấu
                    </th>
                    <th className="inv-table-cell" align="right" style={{ padding: "14px 12px", border: `1px solid ${border}`, fontSize: 14, color: "#f8fafc" }}>
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceLines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        align="center"
                        className="inv-table-cell"
                        style={{
                          padding: "14px 12px",
                          border: `1px solid ${border}`,
                          fontSize: 14,
                          color: "#cbd5e1",
                        }}
                      >
                        Chưa có mã hóa đơn nào được chọn.
                      </td>
                    </tr>
                  ) : (
                    invoiceLines.map((item) => (
                      <tr key={item.id}>
                        <td className="inv-table-cell" style={{ padding: "14px 12px", border: `1px solid ${border}`, fontSize: 14, color: "#e5e7eb" }}>
                          {item.description}
                        </td>
                        <td className="inv-table-cell" align="center" style={{ padding: "14px 12px", border: `1px solid ${border}`, fontSize: 14, color: "#e5e7eb" }}>
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="inv-table-cell" align="center" style={{ padding: "14px 12px", border: `1px solid ${border}`, fontSize: 14, color: "#e5e7eb" }}>
                          {item.quantity}
                        </td>
                        <td className="inv-table-cell" align="center" style={{ padding: "14px 12px", border: `1px solid ${border}`, fontSize: 14, color: "#e5e7eb" }}>
                          {`${item.discountPct.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} %`}
                        </td>
                        <td className="inv-table-cell" align="right" style={{ padding: "14px 12px", border: `1px solid ${border}`, fontSize: 14, color: "#e5e7eb" }}>
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: `22px ${pad} 0` }}>
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ border: 0 }}>
                <tbody>
                  <tr>
                    <td width="52%" valign="top" style={{ paddingTop: 10 }}>
                      <p className="inv-muted" style={{ margin: 0, fontSize: 15, lineHeight: "26px", color: "#cbd5e1" }}>
                        Ghi chú: {form.note?.trim() || "—"}
                      </p>
                      <p className="inv-muted" style={{ margin: "10px 0 0", fontSize: 15, lineHeight: "26px", color: "#cbd5e1" }}>
                        Trạng thái đơn hàng:{" "}
                        <strong style={{ color: "#f8fafc" }}>{orderStatusDisplay}</strong>
                      </p>
                    </td>
                    <td width="48%" align="right">
                      <table role="presentation" cellPadding={0} cellSpacing={0} style={{ marginLeft: "auto", minWidth: 280 }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: "8px 0", fontSize: 16, color: "#cbd5e1" }}>Tiền sản phẩm</td>
                            <td align="right" style={{ padding: "8px 0", fontSize: 16, color: "#f8fafc", fontWeight: 600 }}>
                              {formatCurrency(productTotal)}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: "8px 0", fontSize: 16, color: "#cbd5e1" }}>Giảm giá</td>
                            <td align="right" style={{ padding: "8px 0", fontSize: 16, color: "#f8fafc", fontWeight: 600 }}>
                              {formatCurrency(discountTotal)}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: "8px 0", fontSize: 16, color: "#cbd5e1" }}>Tổng tiền</td>
                            <td align="right" style={{ padding: "8px 0", fontSize: 16, color: "#f8fafc", fontWeight: 600 }}>
                              {formatCurrency(subTotal)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} style={{ padding: "4px 0" }}>
                              <div style={{ borderTop: "1px solid #475569" }} />
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: "10px 0 0", fontSize: 20, color: "#f8fafc", fontWeight: 700 }}>Tổng thanh toán</td>
                            <td align="right" style={{ padding: "10px 0 0", fontSize: 20, color: "#f8fafc", fontWeight: 700 }}>
                              {formatCurrency(subTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ padding: `28px ${pad} 0` }}>
              <p className="inv-muted" style={{ margin: 0, fontSize: 15, lineHeight: "26px", color: "#cbd5e1" }}>
                Cảm ơn Quý khách đã tin tưởng và mua sắm tại <strong>{COMPANY_INFO.name}</strong>.
              </p>
              <p className="inv-muted" style={{ margin: "10px 0 0", fontSize: 15, lineHeight: "26px", color: "#cbd5e1" }}>
                Nếu cần hỗ trợ về đơn hàng, đổi trả hoặc thông tin sản phẩm, vui lòng liên hệ với chúng tôi.
              </p>
              <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: "26px", color: "#f8fafc" }}>
                Xin chân thành cảm ơn và hẹn gặp lại Quý khách!
              </p>
            </div>

            <div style={{ padding: `50px ${pad} 40px` }}>
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td width="55%" />
                    <td width="45%" align="center" style={{ fontSize: 14, color: "#e5e7eb" }}>
                      <strong>Người lập hóa đơn</strong>
                      <div className="invoice-signature" style={{ marginTop: 12 }}>
                        <img
                          src={signImage}
                          alt="Chữ ký"
                          width={160}
                          style={{ display: "block", margin: "0 auto", maxWidth: 180, height: "auto" }}
                        />
                      </div>
                      <div className="inv-link-name" style={{ marginTop: 8, fontStyle: "italic", color: "#93c5fd" }}>
                        {COMPANY_INFO.receiver}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center print-hidden">
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-700 transition"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};
