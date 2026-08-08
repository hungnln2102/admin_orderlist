import React from "react";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

export type DashboardDateRangeValue = {
  from: string;
  to: string;
  chartBucket?: "day" | "month" | "year";
};

type Props = {
  value: DashboardDateRangeValue | null;
  onChange: (next: DashboardDateRangeValue | null) => void;
  className?: string;
};

export const DashboardDateRangeFilter: React.FC<Props> = ({
  value,
  onChange,
  className = "",
}) => {
  return (
    <DateRangePicker
      value={value ? { from: value.from, to: value.to } : null}
      onChange={(range) => {
        if (range) {
          onChange({
            from: range.from,
            to: range.to,
            chartBucket: value?.chartBucket,
          });
        } else {
          onChange(null);
        }
      }}
      className={className}
      placeholder="Từ ngày - Đến ngày"
      align="right"
    />
  );
};
