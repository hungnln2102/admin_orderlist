import React, { useMemo, useState } from "react";

type QuoteLine = {
  id: string;
  product: string;
  packageName: string;
  term: string;
  unitPrice: number;
  quantity: number;
  note?: string;
};

const LOGO_SRC = "/mavryk-logo.png"; // Place transparent logo at public/mavryk-logo.png

const formatCurrency = (value: number): string => value.toLocaleString("vi-VN");

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const displayDate = (iso: string): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60";

export default function ShowPrice() {
  const [quoteDate, setQuoteDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [recipient, setRecipient] = useState("Ms. Diu Nguyen");
  const [contact, setContact] = useState("");
  const [productCode, setProductCode] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([
    { id: "1", product: "Zoom Pro - 100 user", packageName: "1 nam", term: "", unitPrice: 1_950_000, quantity: 1 },
    { id: "2", product: "Zoom Pro - 300 user", packageName: "1 nam", term: "", unitPrice: 3_134_000, quantity: 1 },
    { id: "3", product: "Zoom Pro - 500 user", packageName: "1 nam", term: "", unitPrice: 12_025_000, quantity: 1 },
    { id: "4", product: "Zoom Pro - 1000 user", packageName: "1 nam", term: "", unitPrice: 19_805_000, quantity: 1 },
  ]);

  const totals = useMemo(() => {
    const rows = lines.map((line) => ({
      ...line,
      total: line.unitPrice * line.quantity,
    }));
    const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
    return { rows, grandTotal };
  }, [lines]);

  const handleLineChange = (
    id: string,
    field: keyof QuoteLine,
    value: string
  ) => {
    setLines((prev) =>
      prev.map((line) =>
        line.id === id
          ? {
              ...line,
              [field]:
                field === "unitPrice" || field === "quantity"
                  ? toNumber(value)
                  : value,
            }
          : line
      )
    );
  };

  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((line) => line.id !== id));

  const quoteCode = `BG-${(quoteDate || "").replaceAll("-", "") || "----"}`;

  const handleAddProductCode = () => {
    const code = productCode.trim();
    if (!code) return;
    const nextId = (lines.length + 1).toString();
    setLines((prev) => [
      ...prev,
      {
        id: nextId,
        product: code,
        packageName: "1 nam",
        term: "",
        unitPrice: 0,
        quantity: 1,
      },
    ]);
    setProductCode("");
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <style>{printStyles}</style>

      {/* Control panel - only for editing, not printed */}
      <div className="no-print rounded-2xl bg-white/5 border border-white/10 shadow-lg shadow-indigo-900/30">
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Thong tin bao gia</h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-medium text-white">Kinh gui</span>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-white">Ngay</span>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-white">Ma bao gia</span>
              <input value={quoteCode} readOnly className={`${inputClass} opacity-80`} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-medium text-white">Lien he</span>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className={inputClass}
                placeholder="Email / SDT"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-white">Ghi chu (tuy chon)</span>
              <input
                type="text"
                className={inputClass}
                placeholder="Thong tin them cho bao gia"
              />
            </label>
          </div>

          <div className="border border-white/15 rounded-lg p-3 space-y-2">
            <label className="text-sm font-semibold text-white block">
              Ma san pham
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddProductCode();
                  }
                }}
                className="flex-1 min-w-[260px] rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60"
                placeholder="Nhap ma san pham va nhan Enter"
              />
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded bg-indigo-600/80 hover:bg-indigo-600 text-white px-3 py-2 text-sm"
              >
                Download PDF
              </button>
            </div>
            {lines.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {lines.map((line) => (
                  <span
                    key={line.id}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white text-sm"
                  >
                    {line.product}
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="text-red-300 hover:text-red-200 font-semibold"
                      title="Xoa"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print preview */}
      <div className="print-wrapper flex justify-center">
        <div
          id="quote-print-area"
          className="bg-white text-slate-900 shadow-lg border border-slate-600 print-target"
          style={{ width: "210mm", minHeight: "297mm", padding: "12mm 10mm" }}
        >
          <div className="border border-slate-600">
            {/* Header */}
            <div className="grid grid-cols-[1.1fr_1fr] items-start px-6 pt-5 pb-3">
              <div className="flex items-center gap-4">
                <div className="w-36 h-24 relative flex items-center justify-center">
                  <img
                    src={LOGO_SRC}
                    alt="Mavryk Logo"
                    className="max-w-full max-h-full"
                    style={{ objectFit: "contain", mixBlendMode: "screen" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
              <div className="text-right text-sm leading-6 pr-1">
                <p className="font-semibold">Mavryk Premium Store</p>
                <p>SDT: 0378.304.963</p>
                <p>Web: mavrykpremium.store</p>
              </div>
            </div>

            {/* Title */}
            <div className="text-center text-[15px] font-semibold border-y border-slate-600 bg-slate-100 py-2">
              BANG BAO GIA PHAN MEM ZOOM PRO BAN QUYEN
            </div>

            {/* Intro */}
            <div className="px-6 py-4 text-sm leading-6">
              <p>Ngay: <strong>{displayDate(quoteDate) || "..."}</strong></p>
              <p>Kinh gui: <strong>{recipient}</strong></p>
              {contact ? <p>Thong tin lien he: <strong>{contact}</strong></p> : null}
              <p className="mt-3 italic">
                Loi dau tien, xin tran trong cam on quy khach hang da quan tam den san pham cua chung toi.
                Chung toi xin gui den quy khach hang bang bao gia chi tiet nhu sau:
              </p>
            </div>

            {/* Table */}
            <table className="w-full text-sm border-t border-b border-slate-600">
              <thead>
                <tr className="text-center bg-slate-200 font-semibold">
                  <th className="border border-slate-600 py-2 w-12">STT</th>
                  <th className="border border-slate-600 py-2">TEN SAN PHAM</th>
                  <th className="border border-slate-600 py-2 w-32">GOI</th>
                  <th className="border border-slate-600 py-2 w-32">DON GIA</th>
                  <th className="border border-slate-600 py-2 w-32">THANH TIEN</th>
                  <th className="border border-slate-600 py-2 w-36">GHI CHU</th>
                </tr>
              </thead>
              <tbody>
                {totals.rows.map((row, idx) => (
                  <tr key={row.id} className="align-top">
                    <td className="border border-slate-600 text-center py-2">{idx + 1}</td>
                    <td className="border border-slate-600 px-2 py-2">{row.product}</td>
                    <td className="border border-slate-600 text-center px-2 py-2">
                      {row.packageName || row.term}
                    </td>
                    <td className="border border-slate-600 text-right px-2 py-2">
                      {formatCurrency(row.unitPrice)}
                    </td>
                    <td className="border border-slate-600 text-right px-2 py-2">
                      {formatCurrency(row.total)}
                    </td>
                    <td className="border border-slate-600 px-2 py-2 text-sm text-slate-700">
                      {row.note || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Product info */}
            <div className="px-6 py-4 text-sm leading-6 border-b border-slate-600 space-y-1">
              <p className="font-semibold">Thong Tin San Pham</p>
              <p>Cong dung: Goi 1 nam</p>
              <p>Bao hanh toan thoi gian</p>
              <p>Thoi gian goi: 30h</p>
              <p>So luong nguoi tham gia: 100, 300, 500 den 1000 nguoi</p>
              <p>1GB write lai cuoc hop tren dam may</p>
              <p className="mt-2">
                Moi van de thac mac ve bao gia xin vui long lien he: 0378.304.963
              </p>
              <p className="italic text-[13px]">Xin chan thanh cam on!</p>
            </div>

            {/* Signatures */}
            <div className="flex justify-center px-6 py-8 text-sm text-white">
              <div className="px-6 py-4 space-y-2 min-w-[280px] max-w-md text-center">
                <p className="font-semibold underline underline-offset-2">
                  Mavryk Premium Store
                </p>
                <p className="text-[12px] italic text-white/80">(Ky, ghi ro ho ten)</p>
                <div className="min-h-[90px] flex items-center justify-center">
                  <img
                    src="/signature.png"
                    alt="Chu ky"
                    className="max-h-[90px] max-w-[220px]"
                    style={{ objectFit: "contain" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <p className="font-semibold">Ngo Le Ngoc Hung</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const printStyles = `
  @media print {
    body { background: white !important; }
    .no-print { display: none !important; }
    .print-wrapper { margin: 0 !important; padding: 0 !important; }
    #quote-print-area { box-shadow: none !important; border: 1px solid #475569 !important; }
  }
`;
