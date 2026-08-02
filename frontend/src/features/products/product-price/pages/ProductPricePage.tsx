import { useEffect } from "react";
import { ControlPanel } from "../components/ControlPanel";
import { QuotePrintSheet } from "../components/QuotePrintSheet";
import { useProductPriceQuote } from "../hooks/useProductPriceQuote";
import { QUOTE_PRINT_STYLES } from "./quotePrintStyles";

export default function ProductPricePage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Mavryk Premium Store";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const {
    quoteCode,
    quoteDate,
    greetingAddressee,
    recipient,
    setRecipient,
    contact,
    setContact,
    productSearch,
    setProductSearch,
    selectedProductKeys,
    setSelectedProductKeys,
    lines,
    totals,
    filteredProductOptions,
    productDescSections,
    handleAddSelectedProduct,
    removeLine,
  } = useProductPriceQuote();

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <style>{QUOTE_PRINT_STYLES}</style>

      <ControlPanel
        recipient={recipient}
        onRecipientChange={setRecipient}
        contact={contact}
        onContactChange={setContact}
        productSearch={productSearch}
        onProductSearchChange={setProductSearch}
        filteredOptions={filteredProductOptions}
        selectedProductKeys={selectedProductKeys}
        onToggleProduct={(value) =>
          setSelectedProductKeys((prev) =>
            prev.includes(value)
              ? prev.filter((v) => v !== value)
              : [...prev, value]
          )
        }
        onAddSelectedProduct={handleAddSelectedProduct}
        onResetSearch={() => setProductSearch("")}
        lines={lines}
        onRemoveLine={removeLine}
        onDownload={() => window.print()}
      />

      <QuotePrintSheet
        quoteCode={quoteCode}
        quoteDateYmd={quoteDate}
        greetingAddressee={greetingAddressee}
        contact={contact}
        rows={totals.rows}
        grandTotal={totals.grandTotal}
        productDescSections={productDescSections}
      />
    </div>
  );
}
