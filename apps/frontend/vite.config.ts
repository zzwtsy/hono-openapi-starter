import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiProxy = {
  "/api": {
    target: "http://localhost:3001",
    changeOrigin: true,
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Please make sure that '@tanstack/router-plugin' is passed before '@vitejs/plugin-react'
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      // 忽略测试文件(routes 目录下的 *.test.tsx 不作为路由,避免 router plugin warning)
      routeFileIgnorePattern: "\\.test\\.",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // 后端 dev 在 3001,前端 dev 在 5173;代理 /api 同源访问,cookie 自然携带。
    proxy: apiProxy,
  },
  preview: {
    // E2E 运行 build + preview,保持与 dev server 相同的同源 API/cookie 链路。
    proxy: apiProxy,
  },
});
