import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  /** 占位行数,默认 5。 */
  rows?: number;
}

/**
 * 列表加载骨架:Card 内 N 行 Skeleton。
 * RoleList/UserList/ProjectList 共用,提取避免三处重复。
 */
export function ListSkeleton({ rows = 5 }: ListSkeletonProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
