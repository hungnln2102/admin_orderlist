import {
  CheckCircleIcon,
  EyeIcon,
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import { ORDER_FIELDS, ORDER_STATUSES, Order } from "@/constants";
import {
  buildViewOrderPaymentQrPayload,
  getOrderQrEligibility,
  prefetchQrImage,
} from "../../modals/ViewOrderModal";
import { isGiftOrderCode } from "../../utils/ordersHelpers";

type OrderRowActionsCellProps = {
  order: Order;
  orderTheme: { rowSurfaceClass: string };
  statusText: string;
  canConfirmRefund: boolean;
  canEdit: boolean;
  isCanceled: boolean;
  stopPropagation: (handler: (order: Order) => void) => () => void;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onConfirmRefund: (order: Order) => void;
  onCreateTopupOrderFromRefund: (order: Order) => void;
  onMockWebhook: (order: Order) => void;
};

export function OrderRowActionsCell({
  order,
  orderTheme,
  statusText,
  canConfirmRefund,
  canEdit,
  isCanceled,
  stopPropagation,
  onView,
  onEdit,
  onDelete,
  onConfirmRefund,
  onCreateTopupOrderFromRefund,
  onMockWebhook,
}: OrderRowActionsCellProps) {
  const canMockWebhook = !isCanceled && (statusText === ORDER_STATUSES.CHUA_THANH_TOAN || statusText === ORDER_STATUSES.CAN_GIA_HAN);
  
  return (
        <td className={`order-row__actions px-2 sm:px-4 py-3 sm:py-5 glass-panel border-y transition-all duration-500 last:rounded-r-[16px] sm:last:rounded-r-[24px] ${orderTheme.rowSurfaceClass}`}>
          <div className="flex space-x-2 justify-end flex-shrink-0">
            <button
              onClick={stopPropagation(onView)}
              onMouseEnter={() => {
                const code = String(order[ORDER_FIELDS.ID_ORDER] || "");
                const qrEligibility = getOrderQrEligibility(statusText);
                if (!code) return;
                if (!qrEligibility.canUseQr) return;
                const { qrCodeImageUrl, effectiveQrAmount } =
                  buildViewOrderPaymentQrPayload({
                    order: order as Record<string, unknown>,
                    keepOrderPrice: false,
                    calculatedPrice: null,
                    isGift: isGiftOrderCode(code),
                  });
                if (qrCodeImageUrl && effectiveQrAmount > 0) {
                  prefetchQrImage(qrCodeImageUrl);
                }
              }}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-indigo-300/60 hover:text-white hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all flex-shrink-0"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            {canMockWebhook && (
              <button
                onClick={stopPropagation(onMockWebhook)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all flex-shrink-0"
                title="Giả lập nhận Webhook Sepay"
              >
                <BanknotesIcon className="h-4 w-4" />
              </button>
            )}
            {canConfirmRefund && (
              <button
                onClick={stopPropagation(onCreateTopupOrderFromRefund)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-all flex-shrink-0"
                title="Tạo đơn bù từ credit hoàn tiền"
              >
                <PlusCircleIcon className="h-4 w-4" />
              </button>
            )}
            {canConfirmRefund && (
              <button
                onClick={stopPropagation(onConfirmRefund)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all flex-shrink-0"
                title="Xác nhận đã giải/hoàn tiền"
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
            )}
            {canEdit && !isCanceled && (
              <>
                <button
                  onClick={stopPropagation(onEdit)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all flex-shrink-0"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={stopPropagation(onDelete)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all flex-shrink-0"
                  title="Xoá đơn hàng"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </td>
  );
}
