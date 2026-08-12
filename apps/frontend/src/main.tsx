import { ProgressProvider } from "@bprogress/react";
import { ThemeProvider } from "next-themes";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { App } from "./app";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
    >
      <ErrorBoundary>
        {/* ProgressProvider:全局顶部进度条,颜色随 --primary 主题 token;触发逻辑见 router-progress.tsx。
            trickle: false 避免缓存命中时进度条只走一小段就瞬间完成,导致视觉割裂。 */}
        <ProgressProvider
          color="var(--primary)"
          height="2px"
          options={{ showSpinner: false, trickle: false }}
        >
          <App />
          <Toaster position="top-right" />
        </ProgressProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
