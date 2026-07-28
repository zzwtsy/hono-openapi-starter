import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function OrganizationExplorerSkeleton() {
  return (
    <div className="grid min-h-0 flex-1 grid-rows-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <Card className="flex h-full flex-col">
        <CardContent className="flex flex-col gap-3 p-4">
          {[0, 1, 2, 3, 4, 5].map(row => (
            <Skeleton key={row} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
      <div className="hidden min-w-0 lg:block">
        <Card className="flex h-full flex-col">
          <CardContent className="flex flex-col gap-3 p-4">
            {[0, 1, 2, 3, 4, 5].map(row => (
              <Skeleton key={row} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
