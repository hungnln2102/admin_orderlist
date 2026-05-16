import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { API_BASE_URL } from "../../../config/env";
import { fetchHealth } from "../../../shared/api/client";
import type { HealthResponse } from "../../../shared/api/types";

type HealthState = {
  loading: boolean;
  data: HealthResponse | null;
  error: string | null;
};

const INITIAL_STATE: HealthState = {
  loading: false,
  data: null,
  error: null,
};

export function HealthCheckScreen() {
  const [state, setState] = useState<HealthState>(INITIAL_STATE);

  const statusText = useMemo(() => {
    if (state.loading) return "Đang kiểm tra backend...";
    if (state.error) return `Lỗi: ${state.error}`;
    if (!state.data) return "Chưa kiểm tra kết nối.";
    return `API: ${state.data.status} | DB: ${state.data.dbConnected ? "ok" : "down"} | Redis: ${state.data.redisConnected ? "ok" : "down"}`;
  }, [state]);

  const handleCheckHealth = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchHealth();
      setState({ loading: false, data, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setState({ loading: false, data: null, error: message });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Orderlist Mobile Bootstrap</Text>
      <Text style={styles.subtitle}>API Base: {API_BASE_URL}</Text>
      <Pressable style={styles.button} onPress={handleCheckHealth} disabled={state.loading}>
        <Text style={styles.buttonText}>Kiểm tra /api/health</Text>
      </Pressable>
      {state.loading ? <ActivityIndicator size="small" color="#1d4ed8" /> : null}
      <Text style={styles.status}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#334155",
  },
  button: {
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  status: {
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 20,
  },
});
