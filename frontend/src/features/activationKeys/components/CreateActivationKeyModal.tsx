import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { BaseModal, CustomSelect } from "@/shared/components";
import type { ActivationKeyRule, CreateActivationKeyPayload, EligibleActivationOrder } from "../types";

interface Props {
  onClose: () => void;
  onSubmit: (payload: CreateActivationKeyPayload) => Promise<void>;
}

const RULE_LABEL = "Cấu hình cấp key";
const ORDER_LABEL = "Đơn hàng";

export function CreateActivationKeyModal({ onClose, onSubmit }: Props) {
  const [rules, setRules] = useState<ActivationKeyRule[] | null>(null);
  const [ruleId, setRuleId] = useState("");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<EligibleActivationOrder[] | null>(null);
  const [order, setOrder] = useState<{ value: string; label: string } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRules() {
      try {
        const response = await fetch("/api/products/activation-key-rules", {
          signal: controller.signal,
        });
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.message);
        if (!controller.signal.aborted) {
          setRules((json.data as ActivationKeyRule[]).filter((rule) => rule.is_active));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError((error instanceof Error && error.message) || "Không thể tải cấu hình cấp key.");
          setRules([]);
        }
      }
    }

    void loadRules();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!ruleId) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ rule_id: ruleId, search });

    async function loadOrders() {
      try {
        const response = await fetch(`/api/products/activation-keys/eligible-orders?${params}`, {
          signal: controller.signal,
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message);
        if (!controller.signal.aborted) setOrders(json.data);
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError((error instanceof Error && error.message) || "Không thể tải danh sách đơn hàng.");
          setOrders([]);
        }
      }
    }

    const timer = window.setTimeout(loadOrders, search ? 250 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [ruleId, search]);

  const ruleOptions = (rules ?? []).map((rule) => ({
    value: String(rule.id),
    label: [
      rule.variant_display_name || [rule.product_name, rule.variant_name].filter(Boolean).join(" "),
      rule.supplier_name,
      rule.target_warehouse_name,
      rule.target_variant_tag,
    ].filter(Boolean).join(" · ") || `#${rule.id}`,
  }));
  const orderOptions = (orders ?? []).map(({ id_order, customer }) => ({
    value: id_order,
    label: customer ? `${id_order} · ${customer}` : id_order,
  }));

  function handleRuleChange(value: string) {
    if (value === ruleId) return;
    setRuleId(value);
    setSearch("");
    setOrders(null);
    setOrder(null);
    setLoadError("");
    setSubmitError("");
  }

  function handleSearchChange(value: string) {
    const query = value.trim();
    if (query === search) return;
    setSearch(query);
    setOrders(null);
    setLoadError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ruleId || !order || submitting) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      await onSubmit({ rule_id: Number(ruleId), id_order: order.value });
      onClose();
    } catch (error) {
      setSubmitError((error instanceof Error && error.message) || "Không thể tạo mã kích hoạt.");
      setSubmitting(false);
    }
  }

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title="Tạo mã kích hoạt mới"
      icon={<KeyRound aria-hidden="true" className="h-5 w-5 text-cyan-400" />}
      hideCloseButton={submitting}
      closeOnEsc={!submitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="create-activation-key"
            disabled={!ruleId || !order || submitting}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {submitting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
            {submitting ? "Đang tạo mã..." : "Tạo mã kích hoạt"}
          </button>
        </>
      }
    >
      <form id="create-activation-key" onSubmit={handleSubmit} className="space-y-4">
        {(loadError || submitError) && (
          <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {submitError || loadError}
          </p>
        )}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-slate-200">{RULE_LABEL}</p>
          <CustomSelect
            ariaLabel={RULE_LABEL}
            value={ruleId}
            onChange={handleRuleChange}
            options={ruleOptions}
            disabled={submitting || !ruleOptions.length}
            placeholder={rules === null ? "Đang tải cấu hình..." : "Chọn cấu hình cấp key"}
          />
          {rules?.length === 0 && !loadError && (
            <p role="status" className="text-xs text-slate-400">Chưa có cấu hình cấp key đang hoạt động.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-slate-200">{ORDER_LABEL}</p>
          <CustomSelect
            key={ruleId}
            ariaLabel={ORDER_LABEL}
            value={order?.value ?? ""}
            selectedLabel={order?.label}
            onChange={(value) => {
              setOrder(orderOptions.find((option) => option.value === value) ?? null);
              setSubmitError("");
            }}
            options={orderOptions}
            disabled={!ruleId || submitting}
            searchable
            onSearchChange={handleSearchChange}
            placeholder={ruleId ? "Chọn đơn hàng" : "Chọn cấu hình cấp key trước"}
            searchPlaceholder="Tìm theo mã đơn hoặc khách hàng"
            emptyMessage={orders === null ? "Đang tải đơn hàng..." : loadError || "Không tìm thấy đơn hàng đủ điều kiện."}
          />
        </div>
      </form>
    </BaseModal>
  );
}
