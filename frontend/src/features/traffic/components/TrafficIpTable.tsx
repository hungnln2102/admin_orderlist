import { useEffect, useState } from "react";
import { TablePagination } from "@/shared/components/TablePagination";

interface IpReport {
  available: boolean;
  items?: { ip: string; hits: number; lastSeen: string; city: string | null; country: string | null }[];
  total?: number;
  pageSize?: number;
  geoAvailable?: boolean;
}

export function TrafficIpTable({ days }: { days: number }) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<IpReport>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [revision, setRevision] = useState(0);
  const windowDays = Math.min(days, 30);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetch("/api/traffic/ips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: windowDays, search: query, page }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const { data } = await response.json();
        if (!controller.signal.aborted) {
          setReport(data);
          setStatus("ready");
        }
      })
      .catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [windowDays, query, page, revision]);

  return (
    <section aria-label="Chi tiết truy cập theo IP">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Chi tiết truy cập theo IP</h2>
          <p className="mt-1 text-sm text-slate-400">Lượt tải trang website trong {windowDays} ngày gần nhất · Vị trí IP là ước lượng</p>
        </div>
        <form className="flex flex-wrap gap-2" onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(input.trim());
          setRevision((value) => value + 1);
        }}>
          <input value={input} onChange={(event) => setInput(event.target.value)}
            aria-label="Địa chỉ IPv4 hoặc IPv6" placeholder="Tìm IPv4 / IPv6"
            pattern="[a-fA-F0-9:.]*" maxLength={45}
            className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <button className="rounded-lg border border-sky-800 bg-sky-950 px-3 py-2 text-sm text-sky-100">Tìm IP</button>
        </form>
      </div>
      {status === "loading" && <p role="status" className="mt-4 text-sm text-slate-400">Đang tải dữ liệu IP…</p>}
      {status === "error" && <p role="alert" className="mt-4 text-sm text-amber-300">Không thể tải dữ liệu IP. Bấm Tìm IP để thử lại.</p>}
      {status === "ready" && !report?.available && <p className="mt-4 text-sm text-slate-400">Chưa có nhật ký truy cập IP được kết nối.</p>}
      {status === "ready" && report?.available && (
        <>
          {!report.geoAvailable && <p className="mt-4 text-sm text-slate-400">Nguồn tra vị trí IP chưa khả dụng.</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr><th scope="col" className="p-2">Địa chỉ IP</th><th scope="col" className="p-2">Khu vực ước lượng</th><th scope="col" className="p-2 text-right">Lượt truy cập</th><th scope="col" className="p-2 text-right">Lần cuối</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {report.items?.map((row) => (
                  <tr key={row.ip}>
                    <td className="whitespace-nowrap p-2 font-mono text-sky-200">{row.ip}</td>
                    <td className="p-2">{[row.city, row.country].filter(Boolean).join(", ") || "Chưa xác định"}</td>
                    <td className="p-2 text-right tabular-nums">{row.hits.toLocaleString("vi-VN")}</td>
                    <td className="whitespace-nowrap p-2 text-right tabular-nums">
                      {new Date(row.lastSeen).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}
                    </td>
                  </tr>
                ))}
                {!report.items?.length && <tr><td colSpan={4} className="p-2 text-slate-400">Không có IP phù hợp trong kỳ.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-slate-400">{(report.total ?? 0).toLocaleString("vi-VN")} IP</p>
          <TablePagination currentPage={page} totalPages={Math.ceil((report.total ?? 0) / (report.pageSize ?? 20))}
            pageSize={report.pageSize} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
