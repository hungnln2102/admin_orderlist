import type React from "react";
import ImportPackageBlock from "@/features/warehouse/components/ImportPackageBlock";
import { CreateOrderCreditPanels } from "./CreateOrderCreditPanels";
import { CreateOrderDetailLinesSection } from "./CreateOrderDetailLinesSection";
import { CreateOrderPaymentMethodSection } from "./CreateOrderPaymentMethodSection";
import { CreateOrderPricingSection } from "./CreateOrderPricingSection";
import { CreateOrderProductSection } from "./CreateOrderProductSection";
import { CustomerSelectionForm } from "./CustomerSelectionForm";

type SharedCustomerProps = React.ComponentProps<typeof CustomerSelectionForm>;
type ProductProps = React.ComponentProps<typeof CreateOrderProductSection>;
type DetailLinesProps = React.ComponentProps<typeof CreateOrderDetailLinesSection>;
type PricingProps = React.ComponentProps<typeof CreateOrderPricingSection>;
type PaymentMethodProps = React.ComponentProps<typeof CreateOrderPaymentMethodSection>;
type CreditPanelsProps = React.ComponentProps<typeof CreateOrderCreditPanels>;
type ImportPackageProps = React.ComponentProps<typeof ImportPackageBlock>;

import type { CreateOrderCreationKind } from "../types";
import { ORDER_FIELDS } from "../../../../constants";
import { formatCurrencyPlain } from "@/shared/money";
import { CubeIcon, ArchiveBoxArrowDownIcon, CalendarDaysIcon, CurrencyDollarIcon, PresentationChartLineIcon } from "@heroicons/react/24/outline";
import SearchableSelect from "../SearchableSelect";


type CreateOrderModalBodyProps = {
  orderCreationKind?: CreateOrderCreationKind;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  customer: SharedCustomerProps;
  product: ProductProps;
  detailLines: DetailLinesProps;
  pricing: PricingProps;
  paymentMethod: PaymentMethodProps;
  creditPanels: CreditPanelsProps;
  importPackage: {
    visible: boolean;
    rule: ImportPackageProps["rule"];
    data: ImportPackageProps["data"];
    onChange: ImportPackageProps["onChange"];
  };
};

export const CreateOrderModalBody: React.FC<CreateOrderModalBodyProps> = ({
  orderCreationKind,
  onSubmit,
  customer,
  product,
  detailLines,
  pricing,
  paymentMethod,
  creditPanels,
  importPackage,
}) => {
  const isImport = orderCreationKind === "import";

  if (isImport) {
    const inputPremiumClass = "w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/[0.05] focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300 disabled:opacity-50";
    const labelPremiumClass = "block text-[11px] font-bold text-indigo-100/60 uppercase tracking-widest mb-2 ml-1";

    return (
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 bg-[#030712] relative">
        {/* Deep ambient background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-900/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-900/10 blur-[100px] rounded-full pointer-events-none" />

        <form id="create-order-form" onSubmit={onSubmit} className="max-w-[95rem] mx-auto relative z-10">
          {/* Lưới 2x2 tự động cân bằng chiều cao theo từng hàng ngang */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            
            {/* --- ROW 1, COL 1: Sản Phẩm & Nguồn Cung --- */}
            <div className="h-full flex flex-col relative overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <CubeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">Thông tin nhập hàng</h3>
                  <p className="text-xs text-indigo-200/50 font-medium mt-0.5">Chọn sản phẩm và nguồn cung cấp (NCC)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                <div className="group">
                  <label className={labelPremiumClass}>Sản phẩm</label>
                  {product.customMode ? (
                    <input
                      type="text"
                      name={ORDER_FIELDS.ID_PRODUCT}
                      value={(product.formData[ORDER_FIELDS.ID_PRODUCT] as string) || ""}
                      onChange={(e) => {
                        product.onClearSelectedSupplySelection();
                        product.onFieldChange(e);
                      }}
                      onBlur={product.onCustomProductBlur}
                      className={inputPremiumClass}
                      placeholder="Nhập tên sản phẩm"
                    />
                  ) : (
                    <SearchableSelect
                      name={ORDER_FIELDS.ID_PRODUCT}
                      value={(product.formData[ORDER_FIELDS.ID_PRODUCT] as string) || ""}
                      options={product.productOptions}
                      placeholder="-- Chọn sản phẩm --"
                      onChange={(value) => product.onProductSelect(String(value))}
                      onClear={() => product.onProductSelect("")}
                    />
                  )}
                </div>

                <div className="group">
                  <label className={labelPremiumClass}>Nguồn (Supplier)</label>
                  {product.customMode ? (
                    <input
                      type="text"
                      name={ORDER_FIELDS.SUPPLY}
                      value={(product.formData[ORDER_FIELDS.SUPPLY] as string) || ""}
                      onChange={(e) => {
                        product.onClearSelectedSupplySelection();
                        product.onFieldChange(e);
                      }}
                      className={inputPremiumClass}
                      placeholder="Nhập nguồn"
                    />
                  ) : (
                    <SearchableSelect
                      name={ORDER_FIELDS.SUPPLY}
                      value={product.selectedSupplyId ?? ""}
                      options={product.supplyOptions}
                      placeholder="-- Chọn nguồn --"
                      disabled={!product.formData[ORDER_FIELDS.ID_PRODUCT]}
                      onChange={(value) => product.onSourceSelect(Number(value))}
                      onClear={() => product.onSourceSelect(0)}
                    />
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className={labelPremiumClass}>Ghi chú đơn nhập</label>
                <textarea
                  name={ORDER_FIELDS.NOTE}
                  value={(product.formData[ORDER_FIELDS.NOTE] as string) || ""}
                  onChange={product.onFieldChange}
                  rows={3}
                  placeholder="Ghi chú thêm về lô hàng này..."
                  className={`${inputPremiumClass} resize-none`}
                />
              </div>
            </div>


            {/* --- ROW 1, COL 2: Chi phí & Thời gian --- */}
            <div className="h-full flex flex-col relative overflow-hidden rounded-[28px] border border-emerald-500/10 bg-gradient-to-b from-emerald-950/20 to-transparent p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <CurrencyDollarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">Chi phí & Thời gian</h3>
                  <p className="text-xs text-emerald-200/50 font-medium mt-0.5">Xác định giá nhập và hạn sử dụng</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                <div className="group">
                  <label className={labelPremiumClass}>
                    <div className="flex items-center gap-1.5"><CalendarDaysIcon className="w-3.5 h-3.5" /> Ngày nhập</div>
                  </label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.ORDER_DATE}
                    value={pricing.registerDateDMY}
                    placeholder="dd/mm/yyyy"
                    autoComplete="off"
                    onChange={pricing.onRegisterDateChange}
                    onBlur={pricing.onRegisterDateBlur}
                    className={inputPremiumClass}
                  />
                </div>

                <div className="group">
                  <label className={labelPremiumClass}>
                    <div className="flex items-center gap-1.5"><CalendarDaysIcon className="w-3.5 h-3.5 text-rose-300/70" /> Hết hạn (Tùy chọn)</div>
                  </label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.EXPIRY_DATE}
                    value={(pricing.formData[ORDER_FIELDS.EXPIRY_DATE] as string) || ""}
                    placeholder="dd/mm/yyyy"
                    autoComplete="off"
                    onChange={pricing.onExpiryDateChange}
                    onBlur={pricing.onExpiryDateBlur}
                    className={`${inputPremiumClass} text-rose-300 focus:border-rose-500/50 focus:bg-rose-500/[0.05] focus:shadow-[0_0_20px_rgba(244,63,94,0.1)]`}
                  />
                </div>

                <div className="group md:col-span-2">
                  <label className={`${labelPremiumClass} !text-emerald-300/80`}>Giá Nhập (Cost)</label>
                  {pricing.customMode ? (
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        name={ORDER_FIELDS.COST}
                        value={formatCurrencyPlain(Number(pricing.costValue ?? 0))}
                        onChange={pricing.onCostChange}
                        className={`${inputPremiumClass} font-bold text-emerald-400 text-lg py-2.5`}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400/50 font-bold">VND</div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        name={ORDER_FIELDS.COST}
                        value={formatCurrencyPlain(Number(pricing.costValue))}
                        readOnly
                        className={`${inputPremiumClass} font-bold text-emerald-400/70 text-lg py-2.5 bg-black/20 border-white/5 cursor-not-allowed`}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400/30 font-bold">VND</div>
                    </div>
                  )}
                </div>
              </div>
            </div>


            {/* --- ROW 2: Chi tiết Tài khoản & Lưu kho (FULL WIDTH) --- */}
            <div className="md:col-span-2 relative overflow-hidden rounded-[28px] border border-cyan-500/10 bg-gradient-to-b from-cyan-950/20 to-transparent p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,214,0.2)]">
                  <ArchiveBoxArrowDownIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">
                    Chi tiết Tài khoản & Lưu trữ
                  </h3>
                  <p className="text-xs text-cyan-200/50 font-medium mt-0.5">
                    Cấu hình Slot, Thông tin tài khoản nhập và các thông tin dịch vụ bảo mật đi kèm.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12 items-stretch">
                {/* Cột trái: Cấu hình Nhập Hàng (Details) */}
                <div className="flex-1 flex flex-col">
                  {!detailLines.multiOrderEnabled && detailLines.singleMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                      <div className="group">
                        <label className={labelPremiumClass}>Slot (Vị trí)</label>
                        <input
                          type="text"
                          name={ORDER_FIELDS.SLOT}
                          value={detailLines.singleMode.slot}
                          onChange={(e) => detailLines.singleMode!.onFieldChange(e)}
                          className={inputPremiumClass}
                          placeholder="1, 2, 3..."
                        />
                      </div>
                      <div className="group md:col-span-1">
                        <label className={labelPremiumClass}>Thông tin sản phẩm</label>
                        <input
                          type="text"
                          name={ORDER_FIELDS.INFORMATION_ORDER}
                          value={detailLines.singleMode.informationOrder}
                          onChange={(e) => detailLines.singleMode!.onFieldChange(e)}
                          className={inputPremiumClass}
                          placeholder="Mail, user,..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="-mx-6 sm:-mx-8 -mb-6 sm:-mb-8 flex-1">
                      <div className="opacity-95 [&>section]:!border-none [&>section]:!bg-transparent [&>section]:!p-0 [&>section>div:first-child]:hidden">
                        <CreateOrderDetailLinesSection {...detailLines} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Cột phải: Import Package Service Block */}
                {importPackage.visible ? (
                  <div className="flex-1 w-full relative z-10 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 [&>div]:h-full">
                    <ImportPackageBlock
                      forceShow={true}
                      rule={importPackage.rule}
                      data={importPackage.data}
                      onChange={importPackage.onChange}
                      variant="transparent"
                    />
                  </div>
                ) : (
                  <div className="hidden xl:block"></div>
                )}
              </div>
            </div>
          </div>
          
          <CreateOrderCreditPanels
            {...creditPanels}
            formDataPrice={creditPanels.formDataPrice}
          />
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-4 py-3">
      <form id="create-order-form" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <CustomerSelectionForm {...customer} />
          <CreateOrderProductSection {...product} />
          <CreateOrderDetailLinesSection {...detailLines} />
          <CreateOrderPricingSection {...pricing} />
          <CreateOrderPaymentMethodSection {...paymentMethod} />
        </div>
        {importPackage.visible && (
          <ImportPackageBlock
            forceShow={true}
            rule={importPackage.rule}
            data={importPackage.data}
            onChange={importPackage.onChange}
          />
        )}
        <CreateOrderCreditPanels
          {...creditPanels}
          formDataPrice={creditPanels.formDataPrice}
        />
      </form>
    </div>
  );
};

