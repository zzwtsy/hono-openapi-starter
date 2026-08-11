import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function OrganizationExplorerSkeleton() {
  return (
    <Card size="sm" className="h-full min-h-0">
      <CardHeader>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4, 5].map(row => (
          <Skeleton key={row} className="h-8 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
