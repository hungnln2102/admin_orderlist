import type { UserConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  let build: UserConfig["build"],
    esbuild: UserConfig["esbuild"],
    define: UserConfig["define"];

  const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:3001";
  const frontendPath = resolve(dirname(fileURLToPath(import.meta.url)));
  const rootPath = resolve(frontendPath, "..");
  const sharedPath = resolve(rootPath, "shared");

  if (mode === "development") {
    build = {
      minify: false,
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    };

    esbuild = {
      jsxDev: true,
      keepNames: true,
      minifyIdentifiers: false,
    };

    define = {
      "process.env.NODE_ENV": '"development"',
      __DEV__: "true",
    };
  } else {
    // Production configuration
    build = {
      minify: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    };

    define = {
      "process.env.NODE_ENV": '"production"',
      __DEV__: "false",
    };
  }

  return {
    // Base path for assets - critical for production deployment
    base: '/',
    plugins: [react()],
    build,
    esbuild,
    define,
    server: {
      watch: {
        usePolling: true,
        interval: 300,
      },
      fs: {
        allow: [frontendPath, rootPath, sharedPath],
      },
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        "@": "/src",
        "@/app": "/src/app",
        "@/features": "/src/features",
        "@/shared": "/src/shared",
        "@/services": "/src/services",
        "@/assets": "/src/assets",
        "@/styles": "/src/styles",
        "@shared": sharedPath,
      },
    },
    optimizeDeps: {
      exclude: ["lucide-react"],
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/setupTests.ts",
    },
  };
});
