import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "./list-skeleton";

interface AsyncListStateProps {
  loading: boolean;
  error: unknown;
  data: unknown[] | undefined;
  onRetry?: () => void;
  errorDescription: string;
  errorTitle?: string;
  children: ReactNode;
}

/**
 * 列表加载态:统一 loading(骨架)/ error(告警 + 重试)两态,
 * 消除各列表逐字复制的 early-return 样板(见 code-style §7)。
 *
 * 判定与原实现一致:仅在 `data === undefined`(无缓存)时显示骨架/告警,
 * 有缓存数据时直接渲染 children。空状态由 children 自行处理(各 feature 文案/图标不同)。
 */
export function AsyncListState({ loading, error, data, onRetry, errorDescription, errorTitle = "加载失败", children }: AsyncListStateProps): ReactNode {
  if (loading && data === undefined) {
    return <ListSkeleton />;
  }
  if (error != null && data === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>{errorTitle}</AlertTitle>
          <AlertDescription>{errorDescription}</AlertDescription>
        </Alert>
        {onRetry !== undefined && (
          <Button variant="outline" size="sm" onClick={() => { onRetry(); }}>
            重试
          </Button>
        )}
      </div>
    );
  }
  return children;
}
