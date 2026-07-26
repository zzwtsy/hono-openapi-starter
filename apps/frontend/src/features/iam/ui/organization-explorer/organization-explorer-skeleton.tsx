import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

export function OrganizationExplorerSkeleton() {
  return (
    <div className="grid min-h-128 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {[0, 1].map(panel => (
        <Card key={panel}>
          <CardContent className="flex flex-col gap-3 p-4">
            {[0, 1, 2, 3, 4, 5].map(row => (
              <Skeleton key={row} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
