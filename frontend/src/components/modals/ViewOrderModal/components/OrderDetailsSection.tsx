import type React from "react";
import * as Helpers from "../../../../lib/helpers";
import { ORDER_FIELDS } from "../../../../constants";
import type { OrderView } from "../types";

type OrderDetailsSectionProps = {
  order: OrderView;
  displayStatus: string;
  registrationDisplay: string;
  expiryDisplay: string;
  displayRemainingDays: number;
};

export const OrderDetailsSection = ({
  order,
  displayStatus,
  registrationDisplay,
  expiryDisplay,
  displayRemainingDays,
}: OrderDetailsSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs sm:text-sm">
      <dl className="space-y-2">
        <div className="flex justify-between border-b pb-1">
          <dt className="font-medium text-slate-400 w-1/3">ID Đơn:</dt>
          <dd className="text-slate-100 font-semibold w-2/3 text-right">
            {order[ORDER_FIELDS.ID_ORDER]}
          </dd>
        </div>
        <div className="flex justify-between border-b pb-1">
          <dt className="font-medium text-slate-400 w-1/3">Sản Phẩm:</dt>
          <dd className="text-slate-100 w-2/3 text-right">
            {order[ORDER_FIELDS.ID_PRODUCT]}
          </dd>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between border-b pb-1">
          <dt className="font-medium text-slate-400 sm:w-1/3 mb-1 sm:mb-0">
            Thông Tin Sản Phẩm:
          </dt>
          <dd className="text-slate-100 w-full sm:w-2/3 text-left sm:text-right break-words">
            {order[ORDER_FIELDS.INFORMATION_ORDER]}
          </dd>
        </div>
        <div className="flex justify-between border-b pb-1">
          <dt className="font-medium text-slate-400 w-1/3">Slot:</dt>
          <dd className="text-slate-100 w-2/3 text-right">
            {order[ORDER_FIELDS.SLOT]}
          </dd>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between border-b pb-1">
          <dt className="font-medium text-slate-400 sm:w-1/3 mb-1 sm:mb-0">
            Ghi Chú:
          </dt>
          <dd className="text-slate-100 w-full sm:w-2/3 text-left sm:text-right break-words">
            {order[ORDER_FIELDS.NOTE] || "-"}
          </dd>
        </div>
        <div className="flex justify-between pt-1 pb-1">
          <dt className="font-medium text-slate-400 w-1/3">Trạng Thái:</dt>
          <dd className="w-2/3 text-right">
            <span
              className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full ${Helpers.getStatusColor(
                displayStatus
              )}`}
            >
              {displayStatus}
            </span>
          </dd>
        </div>
      </dl>

      <dl className="space-y-2">
        <div className="flex justify-between border-b pb-1">
          <dt className="font-medium text-slate-400 w-1/3">Khách Hàng:</dt>
          <dd className="text-slate-100 w-2/3 text-right">
            {order[ORDER_FIELDS.CUSTOMER]}
          </dd>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between border-b pb-1 items-start">
          <dt className="font-medium text-slate-400 sm:w-1/3 shrink-0 mb-1 sm:mb-0">
            Liên Hệ:
          </dt>
          <dd className="w-full sm:w-2/3 text-left sm:text-right break-all">
            <a
              href={order[ORDER_FIELDS.CONTACT] as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {order[ORDER_FIELDS.CONTACT] || "-"}
            </a>
          </dd>
        </div>
        <div className="flex justify-between border-b pb-1">
          <dt className="font-medium text-slate-400 w-1/3">Ngày Order:</dt>
          <dd className="text-slate-100 w-2/3 text-right">
            {registrationDisplay}
          </dd>
        </div>
        <div className="flex justify-between border-b pb-1">
          <dt className="font-medium text-slate-400 w-1/3">Số Ngày:</dt>
          <dd className="text-slate-100 w-2/3 text-right">
            {order[ORDER_FIELDS.DAYS]}
          </dd>
        </div>
        <div className="flex justify-between border-b pb-1">
          <dt className="font-medium text-slate-400 w-1/3">Ngày Hết Hạn:</dt>
          <dd className="text-slate-100 w-2/3 text-right">
            {expiryDisplay}
          </dd>
        </div>
        <div className="flex justify-between border-b pb-1">
          <dt className="font-medium text-slate-400 w-1/3">Số Ngày Còn Lại:</dt>
          <dd className="text-indigo-600 font-bold w-2/3 text-right">
            {displayRemainingDays}
          </dd>
        </div>
      </dl>
    </div>
  );
};
