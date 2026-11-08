import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const envFrontend = loadEnv(mode, process.cwd(), "");
  const envBackend = loadEnv(mode, path.resolve(__dirname, "../backend"), "");
  const backendPort = envFrontend.VITE_API_PROXY_PORT || envBackend.PORT || "3002";
  const target = envFrontend.VITE_API_PROXY_TARGET || envFrontend.BACKEND_URL || `http://127.0.0.1:${backendPort}`;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router")) return "react-vendor";
            if (id.includes("node_modules/lucide-react/")) return "icons";
            if (id.includes("node_modules/@google-analytics/")) return "analytics-sdk";
            return undefined;
          },
        },
      },
    },
    server: {
      port: 3003,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});
