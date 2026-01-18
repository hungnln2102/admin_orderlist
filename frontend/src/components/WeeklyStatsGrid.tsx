import React from 'react';
import {
  ShoppingBagIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

interface WeeklyStatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  format?: 'number' | 'currency' | 'percentage';
}

const WeeklyStatCard: React.FC<WeeklyStatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  format = 'number',
}) => {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  const formatValue = () => {
    if (format === 'currency') {
      return `${value}M ₫`;
    }
    if (format === 'percentage') {
      return `${value}%`;
    }
    return value;
  };

  return (
    <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/60 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
          <Icon className="h-6 w-6 text-indigo-400" />
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
            isPositive
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/20 text-rose-400'
          }`}
        >
          <TrendIcon className="h-3 w-3" />
          {Math.abs(change)}%
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-3xl font-bold text-white">{formatValue()}</p>
        <p className="text-sm text-white/60">{title}</p>
      </div>
    </div>
  );
};

export default function WeeklyStatsGrid() {
  const stats = [
    {
      title: 'Đơn Hàng Tuần',
      value: 127,
      change: 12,
      icon: ShoppingBagIcon,
      format: 'number' as const,
    },
    {
      title: 'Doanh Thu Tuần',
      value: 45.2,
      change: 8,
      icon: CurrencyDollarIcon,
      format: 'currency' as const,
    },
    {
      title: 'Khách Hàng Mới',
      value: 34,
      change: 15,
      icon: UserGroupIcon,
      format: 'number' as const,
    },
    {
      title: 'Tỷ Lệ Hoàn Thành',
      value: 94,
      change: -2,
      icon: CheckCircleIcon,
      format: 'percentage' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <WeeklyStatCard key={index} {...stat} />
      ))}
    </div>
  );
}
