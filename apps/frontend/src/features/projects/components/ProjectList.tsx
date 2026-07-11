import { useRequest } from "alova/client";
import { CircleAlert, FolderKanban } from "lucide-react";
import Apis from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN");
}

export function ProjectList() {
  const { data, loading, error, send } = useRequest(() => Apis.Projects.listProjects());

  if (loading) {
    return <ProjectListSkeleton />;
  }
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取项目列表。</AlertDescription>
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
          <FolderKanban />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>暂无项目</EmptyTitle>
          <EmptyDescription>当前组织下还没有项目。</EmptyDescription>
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
                <TableHead>组织</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map(project => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="text-muted-foreground">{project.description ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{project.orgId}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(project.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectListSkeleton() {
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
