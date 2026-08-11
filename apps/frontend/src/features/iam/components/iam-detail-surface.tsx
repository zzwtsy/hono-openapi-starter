import type { ReactNode } from "react";
import type { IamDetailMode } from "./iam-workbench";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface IamDetailSurfaceProps {
  mode: IamDetailMode;
  title: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** IAM 实体详情表面：桌面使用完整 Card 组合，Sheet 内避免嵌套 Card。 */
export function IamDetailSurface({
  mode,
  title,
  description,
  status,
  actions,
  children,
  className,
}: IamDetailSurfaceProps) {
  if (mode === "sheet") {
    return (
      <section className={cn("flex h-full min-h-0 flex-col gap-4", className)}>
        <header className="flex shrink-0 items-start justify-between gap-3 pt-1">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="font-heading min-w-0 text-lg font-semibold wrap-break-word">{title}</h2>
              {status}
            </div>
            {description !== undefined && (
              <div className="text-sm text-muted-foreground wrap-break-word">{description}</div>
            )}
          </div>
          {actions !== undefined && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </section>
    );
  }

  return (
    <Card className={cn("h-full min-h-0", className)}>
      <CardHeader className="shrink-0 border-b">
        <div className="flex min-w-0 items-center gap-2">
          <CardTitle className="min-w-0 text-lg font-semibold wrap-break-word">{title}</CardTitle>
          {status}
        </div>
        {description !== undefined && <CardDescription className="wrap-break-word">{description}</CardDescription>}
        {actions !== undefined && (
          <CardAction>
            <div className="flex items-center gap-1">{actions}</div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">{children}</CardContent>
    </Card>
  );
}
