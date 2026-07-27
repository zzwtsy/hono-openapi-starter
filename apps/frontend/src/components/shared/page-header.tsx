import type { ReactNode } from "react";

interface PageHeaderProps {
  /** 页面标题,渲染为 h1。 */
  title: string;
  /** 标题下描述,渲染为 muted 文字。 */
  description?: string;
  /** 右侧操作区(如"新建"按钮)。未传入时不渲染。 */
  children?: ReactNode;
}

// 页首统一布局:左侧标题 + 描述,右侧 actions。只收展示,不收状态(状态留就近组件)。
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-medium">{title}</h1>
        {description !== undefined && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children !== undefined && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
