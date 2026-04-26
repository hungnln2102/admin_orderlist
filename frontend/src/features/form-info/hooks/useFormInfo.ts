import { useEffect, useState } from "react";
import {
  fetchFormNames,
  fetchFormDetail,
  fetchInputs,
  type FormNameDto,
  type FormDetailDto,
  type FormInputDto,
  type InputDto,
} from "@/lib/formsApi";
import type { FormInfoItem, FormDetailView, FormInfoTab } from "../types";

export function useFormInfo() {
  const [activeTab, setActiveTab] = useState<FormInfoTab>("form");

  const [items, setItems] = useState<FormInfoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inputItems, setInputItems] = useState<InputDto[]>([]);
  const [inputLoading, setInputLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<FormDetailView | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  const [createInputOpen, setCreateInputOpen] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FormInfoItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const rows: FormNameDto[] = await fetchFormNames();
        if (cancelled) return;
        const mapped: FormInfoItem[] = rows.map((row) => ({
          id: Number(row.id),
          name: (row.name || "").trim() || "Chưa đặt tên",
          description: (row.description || "").trim() || "Không có mô tả",
        }));
        setItems(mapped);
      } catch (err) {
        if (!cancelled) {
          setError("Không thể tải danh sách form");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setInputLoading(true);
        setInputError(null);
        const rows: InputDto[] = await fetchInputs();
        if (cancelled) return;
        setInputItems(rows);
      } catch (err) {
        if (!cancelled) {
          setInputError("Không thể tải danh sách input");
          setInputItems([]);
        }
      } finally {
        if (!cancelled) setInputLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleView = async (item: FormInfoItem) => {
    setViewOpen(true);
    setViewError(null);
    setViewLoading(true);
    try {
      const detail: FormDetailDto = await fetchFormDetail(item.id);
      setViewData({
        id: detail.id ?? item.id,
        name: (detail.name || "").trim() || item.name,
        description: (detail.description || "").trim() || item.description,
        inputs: Array.isArray(detail.inputs)
          ? (detail.inputs as FormInputDto[])
          : [],
      });
    } catch (err) {
      // Giữ log để debug khi cần
      // eslint-disable-next-line no-console
      console.error("Không thể tải chi tiết form", err);
      setViewError("Không thể tải chi tiết form");
      setViewData({
        id: item.id,
        name: item.name,
        description: item.description,
        inputs: [],
      });
    } finally {
      setViewLoading(false);
    }
  };

  const handleCloseView = () => {
    setViewOpen(false);
    setViewError(null);
    setViewData(null);
  };

  const handleEdit = (item: FormInfoItem) => {
    setEditingItem(item);
    setEditFormOpen(true);
  };

  const handleEditFormClose = () => {
    setEditFormOpen(false);
    setEditingItem(null);
  };

  const handleEditFormSuccess = (updated: {
    id: number;
    name: string | null;
    description: string | null;
  }) => {
    setItems((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? {
              ...p,
              name: (updated.name || "").trim() || "Chưa đặt tên",
              description: (updated.description || "").trim() || "Không có mô tả",
            }
          : p
      )
    );
    setEditFormOpen(false);
    setEditingItem(null);
  };

  const handleDelete = (item: FormInfoItem) => {
    // TODO: triển khai logic xóa form
    // eslint-disable-next-line no-console
    console.log("Xóa", item);
  };

  const handleCreateForm = () => {
    setCreateFormOpen(true);
  };

  const handleCreateFormClose = () => {
    setCreateFormOpen(false);
  };

  const handleCreateFormSuccess = (item: FormInfoItem & { inputIds?: number[] }) => {
    const mapped: FormInfoItem = {
      id: item.id,
      name: item.name || "Chưa đặt tên",
      description: item.description || "Không có mô tả",
    };
    setItems((prev) => [mapped, ...prev]);
    setCreateFormOpen(false);
  };

  const handleCreateInput = () => {
    setCreateInputOpen(true);
  };

  const handleCreateInputClose = () => {
    setCreateInputOpen(false);
  };

  const handleCreateInputSuccess = (item: InputDto) => {
    setInputItems((prev) => [item, ...prev]);
    setCreateInputOpen(false);
  };

  return {
    activeTab,
    setActiveTab,
    items,
    loading,
    error,
    inputItems,
    inputLoading,
    inputError,
    viewOpen,
    viewData,
    viewLoading,
    viewError,
    createInputOpen,
    createFormOpen,
    editFormOpen,
    editingItem,
    handleView,
    handleCloseView,
    handleEdit,
    handleDelete,
    handleCreateForm,
    handleCreateFormClose,
    handleCreateFormSuccess,
    handleEditFormClose,
    handleEditFormSuccess,
    handleCreateInput,
    handleCreateInputClose,
    handleCreateInputSuccess,
  };
}

