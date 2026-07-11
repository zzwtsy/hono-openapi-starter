import { useRequest } from "alova/client";
import { CircleAlert, ShieldCheck } from "lucide-react";
import Apis from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN");
}

export function RoleList() {
  const { data, loading, error, send } = useRequest(() => Apis.IAM.listRoles(), { cacheFor: 60_000 });

  if (loading) {
    return <RoleListSkeleton />;
  }
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取角色列表。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => { void send(); }}>
          重试
        </Button>
      </div>
    );
  }
  if (data?.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <ShieldCheck />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>暂无角色</EmptyTitle>
          <EmptyDescription>当前组织下还没有角色。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map(role => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground">{role.description ?? "-"}</TableCell>
                  <TableCell>
                    {role.source === "code"
                      ? (
                          <Tooltip>
                            <TooltipTrigger render={<Badge variant="secondary">代码</Badge>} />
                            <TooltipContent>代码同步角色，不可修改或删除</TooltipContent>
                          </Tooltip>
                        )
                      : (
                          <Badge>实例</Badge>
                        )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(role.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleListSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        {[0, 1, 2, 3, 4].map(row => (
          <Skeleton key={row} className="h-8 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
