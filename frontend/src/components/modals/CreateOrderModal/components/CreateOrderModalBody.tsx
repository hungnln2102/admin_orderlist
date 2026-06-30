import type React from "react";
import ImportPackageBlock from "@/features/warehouse/components/ImportPackageBlock";
import { CreateOrderCreditPanels } from "./CreateOrderCreditPanels";
import { CreateOrderDetailLinesSection } from "./CreateOrderDetailLinesSection";
import { CreateOrderPaymentMethodSection } from "./CreateOrderPaymentMethodSection";
import { CreateOrderPricingSection } from "./CreateOrderPricingSection";
import { CreateOrderProductSection } from "./CreateOrderProductSection";
import { CreateOrderSharedCustomerSection } from "./CreateOrderSharedCustomerSection";

type SharedCustomerProps = React.ComponentProps<typeof CreateOrderSharedCustomerSection>;
type ProductProps = React.ComponentProps<typeof CreateOrderProductSection>;
type DetailLinesProps = React.ComponentProps<typeof CreateOrderDetailLinesSection>;
type PricingProps = React.ComponentProps<typeof CreateOrderPricingSection>;
type PaymentMethodProps = React.ComponentProps<typeof CreateOrderPaymentMethodSection>;
type CreditPanelsProps = React.ComponentProps<typeof CreateOrderCreditPanels>;
type ImportPackageProps = React.ComponentProps<typeof ImportPackageBlock>;

type CreateOrderModalBodyProps = {
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
  onSubmit,
  customer,
  product,
  detailLines,
  pricing,
  paymentMethod,
  creditPanels,
  importPackage,
}) => (
  <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-4 py-3">
    <form id="create-order-form" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <CreateOrderSharedCustomerSection {...customer} />
        <CreateOrderProductSection {...product} />
        <CreateOrderDetailLinesSection {...detailLines} />
        <CreateOrderPricingSection {...pricing} />
        <CreateOrderPaymentMethodSection {...paymentMethod} />
      </div>
      {importPackage.visible && (
        <ImportPackageBlock
          rule={importPackage.rule}
          data={importPackage.data}
          onChange={importPackage.onChange}
        />
      )}
      <CreateOrderCreditPanels
        {...creditPanels}
        formDataPrice={creditPanels.formDataPrice ?? creditPanels.prefillContext?.initialFormData?.[ORDER_FIELDS.PRICE]}
      />
    </form>
  </div>
);

