import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Loader2, RefreshCw, Save, Send, ToggleLeft, ToggleRight, Trash2, Unplug } from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import { externalApiClient } from "@/features/external-api/api/externalApiClient";
import type { PortalSlotItem, ProductItem } from "@/features/external-api/types";

type Provider = { key: string; name: string; category: string; description: string; input: string; enabled: boolean; configured: boolean; status: string };

type TestState = { value: string; loading: boolean; result?: string };

export const ExternalApiConfigController: React.FC = () => {
  const notification = useNotification();
  const showToast = (type: "success" | "error", message: string) => notification[type](message);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [testInputs, setTestInputs] = useState<Record<string, TestState>>({});
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [availableApis, setAvailableApis] = useState<any[]>([]);
  const [slots, setSlots] = useState<PortalSlotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [providerResponse, mappingResponse, slotResponse] = await Promise.all([
        fetch("/api/system/providers", { credentials: "include" }).then((response) => response.json()),
        externalApiClient.getProductApis().then((response) => response.json()),
        externalApiClient.getPortalSlots().then((response) => response.json()),
      ]);
      setProviders(providerResponse.providers || []);
      setProducts(mappingResponse.products || []);
      setAvailableApis(mappingResponse.availableApis || []);
      setSlots(slotResponse.slots || []);
    } catch (error: any) {
      showToast("error", error.message || "Không thể tải cấu hình provider.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const configuredCount = useMemo(() => providers.filter((provider) => provider.configured).length, [providers]);
  const setInput = (key: string, value: string) => setTestInputs((current) => ({ ...current, [key]: { ...(current[key] || { loading: false }), value } }));
  const testProvider = async (provider: Provider) => {
    const value = testInputs[provider.key]?.value?.trim() || "";
    if (!value) { showToast("error", "Vui lòng nhập dữ liệu kiểm tra."); return; }
    setTestInputs((current) => ({ ...current, [provider.key]: { value, loading: true } }));
    try {
      const response = await fetch("/api/system/providers/" + encodeURIComponent(provider.key) + "/test", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: value, email: value }) });
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.error || "Provider kiểm tra thất bại.");
      setTestInputs((current) => ({ ...current, [provider.key]: { value, loading: false, result: data.otp ? "OTP: " + data.otp : data.message || "Đã kết nối" } }));
      showToast("success", "Đã kiểm tra " + provider.name + ".");
    } catch (error: any) {
      setTestInputs((current) => ({ ...current, [provider.key]: { value, loading: false, result: error.message } }));
      showToast("error", error.message || "Provider kiểm tra thất bại.");
    }
  };

  const assignProvider = async (productId: number, providerKey: string) => {
    if (!providerKey) return;
    try {
      const response = await externalApiClient.assignProductApi({ productId, providerKey, isDefault: false });
      const data = await response.json(); if (!response.ok || data.success === false) throw new Error(data.error || "Không thể gán provider.");
      showToast("success", "Đã cập nhật mapping provider."); await load();
    } catch (error: any) { showToast("error", error.message || "Không thể gán provider."); }
  };
  const removeMapping = async (mappingId: number) => {
    try { const response = await externalApiClient.removeProductApi(mappingId); const data = await response.json(); if (!response.ok || data.success === false) throw new Error(data.error || "Không thể gỡ mapping."); await load(); } catch (error: any) { showToast("error", error.message || "Không thể gỡ mapping."); }
  };
  const updateSlot = (slotKey: string, field: "primary_service_key" | "fallback_service_key", value: string) => setSlots((current) => current.map((slot) => slot.slot_key === slotKey ? { ...slot, [field]: value || null, assigned_services: field === "primary_service_key" ? [value, ...(slot.fallback_service_key && slot.fallback_service_key !== value ? [slot.fallback_service_key] : [])].filter((item): item is string => Boolean(item)) : [slot.primary_service_key, value].filter((item): item is string => Boolean(item)) } : slot));
  const saveSlots = async () => {
    setSaving(true);
    try { const response = await externalApiClient.savePortalSlots({ value: JSON.stringify(slots) }); const data = await response.json(); if (!response.ok || data.success === false) throw new Error(data.error || "Không thể lưu mapping ô input."); showToast("success", "Đã lưu mapping ô input."); } catch (error: any) { showToast("error", error.message || "Không thể lưu mapping ô input."); } finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-slate-300 flex items-center gap-2"><Loader2 className="animate-spin" /> Đang tải provider...</div>;
  return <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.25em] text-cyan-400">OTP Gateway</p><h1 className="text-2xl md:text-3xl font-black">Provider hard-code</h1><p className="text-sm text-slate-400 mt-1">Cấu hình endpoint và secret nằm trong biến môi trường, không lưu trong database.</p></div><button onClick={() => void load()} className="px-3 py-2 rounded-xl border border-slate-700 hover:border-cyan-500 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Làm mới</button></header>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden"><div className="px-5 py-4 border-b border-slate-800 flex justify-between"><h2 className="font-bold">Danh sách provider</h2><span className="text-sm text-slate-400">{configuredCount}/{providers.length} sẵn sàng</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-950/70 text-slate-400"><tr><th className="text-left px-5 py-3">Tên dịch vụ</th><th className="text-left px-5 py-3 min-w-[280px]">Ô input test</th><th className="text-left px-5 py-3">Trạng thái</th><th className="text-center px-5 py-3">On/Off</th></tr></thead><tbody>{providers.map((provider) => { const test = testInputs[provider.key] || { value: "", loading: false }; return <tr key={provider.key} className="border-t border-slate-800"><td className="px-5 py-4"><div className="font-bold">{provider.name}</div><div className="text-xs text-slate-500 font-mono">{provider.key} · {provider.category}</div><div className="text-xs text-slate-400 mt-1">{provider.description}</div></td><td className="px-5 py-4"><div className="flex gap-2"><input value={test.value} onChange={(event) => setInput(provider.key, event.target.value)} placeholder={provider.input === "secret" ? "Nhập secret Base32..." : "Nhập email hoặc mã đơn..."} className="min-w-0 flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 outline-none focus:border-cyan-500" /><button onClick={() => void testProvider(provider)} disabled={test.loading} className="rounded-lg bg-cyan-600 px-3 py-2 font-semibold hover:bg-cyan-500 disabled:opacity-50">{test.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button></div>{test.result && <div className="text-xs text-slate-400 mt-2 break-words">{test.result}</div>}</td><td className="px-5 py-4">{provider.status === "READY" ? <span className="inline-flex items-center gap-1.5 text-emerald-300"><CheckCircle2 className="w-4 h-4" /> Sẵn sàng</span> : <span className="inline-flex items-center gap-1.5 text-amber-300"><Circle className="w-4 h-4" /> Chưa cấu hình</span>}</td><td className="px-5 py-4 text-center">{provider.enabled ? <ToggleRight className="mx-auto text-emerald-400" /> : <ToggleLeft className="mx-auto text-slate-600" />}</td></tr>; })}</tbody></table></div></section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4"><div><h2 className="font-bold">Mapping provider với sản phẩm</h2><p className="text-sm text-slate-400">Mapping chỉ lưu khóa provider trong bảng nghiệp vụ; không còn phụ thuộc ID cấu hình API.</p></div>{products.map((product) => <div key={product.id} className="rounded-xl border border-slate-800 p-4"><div className="flex flex-wrap justify-between gap-3"><div><div className="font-semibold">{product.package_name}</div><div className="text-xs text-slate-500">#{product.id} · {product.variants_count} biến thể</div></div><select defaultValue="" onChange={(event) => { void assignProvider(product.id, event.target.value); event.currentTarget.value = ""; }} className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"><option value="">+ Gán provider</option>{availableApis.map((api) => <option key={api.provider_key || api.service_key} value={api.provider_key || api.service_key}>{api.service_name} ({api.provider_key || api.service_key})</option>)}</select></div><div className="flex flex-wrap gap-2 mt-3">{product.apis.map((api: any) => <span key={api.mapping_id} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs"><span>{api.service_name}</span><button onClick={() => void removeMapping(api.mapping_id)} className="text-rose-300 hover:text-rose-200" title="Gỡ mapping"><Trash2 className="w-3.5 h-3.5" /></button></span>)}</div></div>)}</section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">Mapping provider với ô input OTP</h2><p className="text-sm text-slate-400">Giữ luồng slot hiện có, chỉ cho phép chọn provider trong catalog hard-code.</p></div><button onClick={() => void saveSlots()} disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /> Lưu mapping</button></div>{slots.map((slot) => <div key={slot.slot_key} className="grid md:grid-cols-[1fr_220px_220px] gap-3 items-center border-t border-slate-800 pt-3"><div><div className="font-semibold">{slot.name}</div><div className="text-xs text-slate-500">{slot.slot_key}</div></div><select value={slot.primary_service_key || ""} onChange={(event) => updateSlot(slot.slot_key, "primary_service_key", event.target.value)} className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"><option value="">Provider chính</option>{providers.map((provider) => <option key={provider.key} value={provider.key}>{provider.name}</option>)}</select><select value={slot.fallback_service_key || ""} onChange={(event) => updateSlot(slot.slot_key, "fallback_service_key", event.target.value)} className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"><option value="">Không fallback</option>{providers.map((provider) => <option key={provider.key} value={provider.key}>{provider.name}</option>)}</select></div>)}</section>
  </div>;
};
export default ExternalApiConfigController;
