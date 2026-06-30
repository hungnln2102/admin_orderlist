import { useEffect, useMemo, useState } from "react";
import type { ActiveKeyItem, CreateKeySuccessPayload } from "./types";
import { ActiveKeyPlainBanner } from "./components/ActiveKeyPlainBanner";
import { ActiveKeysHeader } from "./components/ActiveKeysHeader";
import { ActiveKeysSearch } from "./components/ActiveKeysSearch";
import { ActiveKeysTablePanel } from "./components/ActiveKeysTablePanel";
import { CreateKeyModal } from "./components/CreateKeyModal";
import { apiFetch } from "@/shared/api/client";

const PAGE_SIZE = 10;

export default function ActiveKeys() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"keys" | "products">("keys");
  const [keyPage, setKeyPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [keys, setKeys] = useState<ActiveKeyItem[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [plainKeyBanner, setPlainKeyBanner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resp = await apiFetch("/api/key-active/keys");
        if (!resp.ok) {
          throw new Error("Failed to fetch active keys");
        }
        const payload = await resp.json();
        const items = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
          ? payload
          : [];
        if (!cancelled) {
          setKeys(items);
        }
      } catch {
        if (!cancelled) {
          setKeys([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return keys;
    const q = searchTerm.trim().toLowerCase();
    return keys.filter((item) => {
      const st = (item.status || "").toLowerCase();
      const sys = (item.systemName || "").toLowerCase();
      return (
        item.account.toLowerCase().includes(q) ||
        item.product.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        item.expiry.toLowerCase().includes(q) ||
        st.includes(q) ||
        sys.includes(q)
      );
    });
  }, [searchTerm, keys]);

  const totalKeyItems = filtered.length;
  const startKey = (keyPage - 1) * PAGE_SIZE;
  const currentKeyRows = filtered.slice(startKey, startKey + PAGE_SIZE);

  const productSummary = useMemo(() => {
    const map = new Map<
      string,
      { product: string; keyCount: number }
    >();
    filtered.forEach((item) => {
      const label = (item.systemName || item.product || "").trim();
      if (!label) return;
      const existing = map.get(label) || {
        product: label,
        keyCount: 0,
      };
      existing.keyCount += 1;
      map.set(label, existing);
    });
    return Array.from(map.values());
  }, [filtered]);

  const totalProductItems = productSummary.length;
  const startProduct = (productPage - 1) * PAGE_SIZE;
  const currentProductRows = productSummary.slice(
    startProduct,
    startProduct + PAGE_SIZE
  );

  const handleView = (item: ActiveKeyItem) => {
    console.log("View", item);
  };

  const handleEdit = (item: ActiveKeyItem) => {
    console.log("Edit", item);
  };

  const handleCreateSuccess = ({
    item,
    plainKey,
  }: CreateKeySuccessPayload) => {
    setKeys((prev) => [item, ...prev]);
    setCreateModalOpen(false);
    setPlainKeyBanner(plainKey);
  };

  return (
    <div className="space-y-6">
      <ActiveKeysHeader onCreate={() => setCreateModalOpen(true)} />

      <CreateKeyModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <ActiveKeyPlainBanner plainKey={plainKeyBanner} onClose={() => setPlainKeyBanner(null)} />

      <ActiveKeysSearch
        searchTerm={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setKeyPage(1);
          setProductPage(1);
        }}
      />

      <ActiveKeysTablePanel
        activeTab={activeTab}
        currentKeyRows={currentKeyRows}
        currentProductRows={currentProductRows}
        keyPage={keyPage}
        productPage={productPage}
        totalKeyItems={totalKeyItems}
        totalProductItems={totalProductItems}
        startKey={startKey}
        startProduct={startProduct}
        onTabChange={setActiveTab}
        onKeyPageChange={setKeyPage}
        onProductPageChange={setProductPage}
        onView={handleView}
        onEdit={handleEdit}
      />
    </div>
  );
}
