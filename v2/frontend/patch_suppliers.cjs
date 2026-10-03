const fs = require("fs");
const path = "./src/pages/SuppliersPage.tsx";
let content = fs.readFileSync(path, "utf-8");

// Replace root container class
content = content.replace(
  /className="space-y-6 pb-12"/,
  'className="p-3 sm:p-6 space-y-6 max-w-[1650px] mx-auto pb-12"'
);

// Replace table wrapper
content = content.replace(
  /<div className="overflow-x-auto">\s*<table className="w-full text-left whitespace-nowrap min-w-\[1000px\]">([\s\S]*?)<\/table>\s*<\/div>/,
  '<div className="w-full">' +
  '      {/* Desktop View */}' +
  '      <div className="hidden sm:block overflow-x-auto custom-scrollbar flex-1 w-full">' +
  '        <table className="w-full text-left whitespace-nowrap min-w-[1000px]">' +
  '          $1' +
  '        </table>' +
  '      </div>' +
  '      {/* Mobile Card List View */}' +
  '      <div className="block sm:hidden divide-y divide-slate-800/80 p-3 space-y-3">' +
  '        {suppliers.map((s) => (' +
  '          <div key={s.id} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md">' +
  '            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">' +
  '              <span className="font-bold text-white text-sm">{s.supplier_name}</span>' +
  '              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.active_supply ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border border-rose-500/30"}`}>' +
  '                {s.active_supply ? "Đang cấp" : "Tạm dừng"}' +
  '              </span>' +
  '            </div>' +
  '            <div className="space-y-1.5 text-xs text-slate-300">' +
  '              <div className="flex justify-between">' +
  '                <span className="text-slate-400">Tài khoản Bank:</span>' +
  '                <span className="font-mono text-slate-200">{s.number_bank || "—"} ({s.account_holder || "—"})</span>' +
  '              </div>' +
  '              <div className="flex justify-between">' +
  '                <span className="text-slate-400">Tổng đơn nhập:</span>' +
  '                <span className="font-semibold">{s.total_orders} đơn</span>' +
  '              </div>' +
  '              <div className="flex justify-between">' +
  '                <span className="text-slate-400">Còn nợ NCC:</span>' +
  '                <span className="font-mono font-bold text-amber-400">{new Intl.NumberFormat("vi-VN").format(s.total_debt || 0)} ₫</span>' +
  '              </div>' +
  '            </div>' +
  '            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">' +
  '              <button' +
  '                onClick={() => handleOpenDetail(s)}' +
  '                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-cyan-300 font-medium"' +
  '              >' +
  '                Chi tiết' +
  '              </button>' +
  '              <button' +
  '                onClick={() => openEditModal(s)}' +
  '                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 font-medium"' +
  '              >' +
  '                Sửa' +
  '              </button>' +
  '            </div>' +
  '          </div>' +
  '        ))}' +
  '      </div>' +
  '    </div>'
);

fs.writeFileSync(path, content, "utf-8");
console.log("Updated SuppliersPage.tsx");
