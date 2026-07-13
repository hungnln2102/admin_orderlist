/**
 * ResponsiveTable Component
 * Wraps tables with responsive behavior - shows card view on mobile
 */

import React, { ReactNode } from "react";

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
  cardView?: ReactNode; // Optional card view for mobile
  showCardOnMobile?: boolean; // Whether to show card view on mobile
}

/**
 * ResponsiveTable - Wraps table with mobile-friendly overflow
 * On mobile: Shows horizontal scroll
 * On larger screens: Normal table display
 */
export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  children,
  className = "",
  cardView,
  showCardOnMobile = false,
}) => {
  if (showCardOnMobile && cardView) {
    return (
      <>
        {/* Card view for mobile */}
        <div className="block md:hidden">{cardView}</div>
        
        {/* Table view for desktop */}
        <div className={`hidden md:block ${className}`}>
          <div className="overflow-x-visible">
            <div className="inline-block min-w-full align-middle">
              {children}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      {children}
    </div>
  );
};

/**
 * TableCard - Component for displaying table data as cards on mobile
 */
interface TableCardProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => ReactNode;
  className?: string;
  emptyMessage?: ReactNode;
}

export function TableCard<T>({
  data,
  renderCard,
  className = "",
  emptyMessage = <div className="p-4 text-center text-sm text-slate-500">Không có dữ liệu</div>,
}: TableCardProps<T>) {
  if (!data || data.length === 0) {
    return <div className={className}>{emptyMessage}</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {data.map((item, index) => (
        <React.Fragment key={index}>
          {renderCard(item, index)}
        </React.Fragment>
      ))}
    </div>
  );
}
