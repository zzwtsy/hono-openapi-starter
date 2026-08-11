import type { ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";

export type IamDetailMode = "card" | "sheet";

interface IamWorkbenchProps {
  title: string;
  description: string;
  actions?: ReactNode;
  navigation: ReactNode;
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
  sheetTitle: string;
  sheetDescription: string;
  renderDetail: (mode: IamDetailMode) => ReactNode;
}

const DESKTOP_MEDIA_QUERY = "(min-width: 1280px)";

/**
 * IAM 主从工作台。媒体条件决定详情唯一挂载位置，避免桌面隐藏面板与
 * Sheet 同时持有请求和局部状态。
 */
export function IamWorkbench({
  title,
  description,
  actions,
  navigation,
  detailsOpen,
  onDetailsOpenChange,
  sheetTitle,
  sheetDescription,
  renderDetail,
}: IamWorkbenchProps) {
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
      <PageHeader title={title} description={description}>
        {actions}
      </PageHeader>

      <div className="min-h-0 flex-1 xl:grid xl:grid-cols-[minmax(18rem,20rem)_minmax(0,1fr)] xl:grid-rows-1 xl:gap-4">
        {navigation}
        {isDesktop && (
          <div className="min-h-0 min-w-0">
            {renderDetail("card")}
          </div>
        )}
      </div>

      {!isDesktop && (
        <Sheet open={detailsOpen} onOpenChange={onDetailsOpenChange}>
          <SheetContent
            side="right"
            className="overflow-hidden data-[side=right]:w-full sm:data-[side=right]:max-w-2xl"
          >
            <SheetHeader className="shrink-0 border-b">
              <SheetTitle>{sheetTitle}</SheetTitle>
              <SheetDescription>{sheetDescription}</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 px-4 pb-4">
              {detailsOpen ? renderDetail("sheet") : null}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
