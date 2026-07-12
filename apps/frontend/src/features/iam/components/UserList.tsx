import type { UserSummary } from "@/api/globals";
import { useRequest } from "alova/client";
import { CircleAlert, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import Apis from "@/api";
import { Can } from "@/components/Can";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAuthorizationDialog } from "./user-authorization-dialog";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN");
}

interface UserListProps {
  orgId: string;
}

export function UserList({ orgId }: UserListProps) {
  const { data: users, loading, error, send } = useRequest(() => Apis.IAM.listUsers());
  const { data: roles } = useRequest(() => Apis.IAM.listRoles());
  const [authorizing, setAuthorizing] = useState<UserSummary | null>(null);

  if (loading && users === undefined) {
    return <UserListSkeleton />;
  }
  if (error !== null && users === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取用户列表。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => { void send(); }}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {users?.length === 0
        ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>暂无用户</EmptyTitle>
                <EmptyDescription>当前组织下还没有用户。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>用户名</TableHead>
                        <TableHead>邮箱</TableHead>
                        <TableHead>创建时间</TableHead>
                        <Can perm="iam.manage">
                          <TableHead className="text-right">操作</TableHead>
                        </Can>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="text-muted-foreground">{u.email}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                          <Can perm="iam.manage">
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setAuthorizing(u); }}
                              >
                                <ShieldCheck />
                                授权
                              </Button>
                            </TableCell>
                          </Can>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

      <Dialog
        open={authorizing !== null}
        onOpenChange={(o) => {
          if (!o)
            setAuthorizing(null);
        }}
      >
        {authorizing !== null && roles !== undefined && (
          <UserAuthorizationDialog
            key={authorizing.id}
            user={authorizing}
            orgId={orgId}
            roles={roles}
          />
        )}
      </Dialog>
    </div>
  );
}

function UserListSkeleton() {
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
