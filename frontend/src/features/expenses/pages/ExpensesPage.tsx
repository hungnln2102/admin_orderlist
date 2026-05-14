import React from "react";
import { ExpenseCostAllocationTable } from "../components/ExpenseCostAllocationTable";

const ExpensesPage: React.FC = () => {
  return (
    <div className="space-y-6 p-3 sm:p-4 lg:p-6">
      <section className="rounded-[24px] border border-violet-500/25 bg-[linear-gradient(135deg,rgba(30,27,75,0.50)_0%,rgba(15,23,42,0.72)_52%,rgba(12,18,32,0.88)_100%)] px-5 py-6 shadow-[0_24px_70px_-28px_rgba(79,70,229,0.48),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-indigo-200/70">
          Expense workspace
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-4xl">
          Chi phí
        </h1>
      </section>

      <ExpenseCostAllocationTable />
    </div>
  );
};

export default ExpensesPage;
