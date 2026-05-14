import React, { useState } from "react";
import {
  TaxDailyFormTable,
  type TaxMetric,
  type TaxViewMode,
} from "../components/TaxDailyFormTable";
import { TaxOverviewStats } from "../components/TaxOverviewStats";
import { useTaxOrders } from "../hooks/useTaxOrders";

const TaxPage: React.FC = () => {
  const { orders, loading, error } = useTaxOrders();
  const [viewMode, setViewMode] = useState<TaxViewMode>("day");
  const [activeMetric, setActiveMetric] = useState<TaxMetric>("revenue");

  const metricTabs: Array<{ key: TaxMetric; label: string }> = [
    { key: "revenue", label: "Doanh thu" },
    { key: "profit", label: "Lợi nhuận" },
    { key: "refund", label: "Hoàn tiền" },
  ];

  return (
    <div className="space-y-6 p-3 sm:p-4 lg:p-6">
      <section className="rounded-[24px] border border-violet-500/25 bg-[linear-gradient(135deg,rgba(30,27,75,0.50)_0%,rgba(15,23,42,0.72)_52%,rgba(12,18,32,0.88)_100%)] px-5 py-6 shadow-[0_24px_70px_-28px_rgba(79,70,229,0.48),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-indigo-200/70">
          Tax workspace
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-4xl">
          Thuế
        </h1>
      </section>

      <TaxOverviewStats orders={orders} loading={loading} viewMode={viewMode} />

      <div className="rounded-2xl border border-indigo-400/20 bg-slate-950/55 p-1 shadow-[0_18px_50px_-30px_rgba(79,70,229,0.6)]">
        <div className="grid gap-1 sm:grid-cols-3">
          {metricTabs.map((tab) => {
            const active = activeMetric === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveMetric(tab.key)}
                className={`h-11 rounded-xl px-4 text-sm font-bold uppercase tracking-[0.12em] transition ${
                  active
                    ? "border border-violet-300/45 bg-violet-400/18 text-white shadow-[0_14px_35px_-24px_rgba(167,139,250,0.95)]"
                    : "border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <TaxDailyFormTable
        orders={orders}
        loading={loading}
        error={error}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        metric={activeMetric}
      />
    </div>
  );
};

export default TaxPage;
