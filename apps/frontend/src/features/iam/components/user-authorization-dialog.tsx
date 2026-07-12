import type { Role, UserSummary } from "@/api/globals";
import { useRequest } from "alova/client";
import { CircleAlert, KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

interface UserAuthorizationDialogProps {
  user: UserSummary;
  orgId: string;
  roles: Role[];
}

export function UserAuthorizationDialog({ user, orgId, roles }: UserAuthorizationDialogProps) {
  const { data: effectivePerms, loading: permsLoading, error: permsError, send: sendPerms } = useRequest(
    () => Apis.IAM.listUserPermissions({ pathParams: { userId: user.id }, params: { orgId } }),
  );
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const roleItems = [
    { label: "请选择角色...", value: null },
    ...roles.map(r => ({ label: r.name, value: r.id })),
  ];

  const assignRole = async () => {
    if (selectedRoleId === "" || assigning) {
      return;
    }
    setAssigning(true);
    try {
      await Apis.IAM.assignUserRole({
        pathParams: { userId: user.id, roleId: selectedRoleId },
        data: { orgId },
      });
      toast.success("角色已授予");
      void sendPerms();
      setSelectedRoleId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "授权失败");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          用户授权 ·
          {user.name}
        </DialogTitle>
        <DialogDescription>
          {user.email}
        </DialogDescription>
      </DialogHeader>

      {permsError !== null && effectivePerms === undefined
        ? (
            <div className="flex flex-col items-start gap-3">
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>加载失败</AlertTitle>
                <AlertDescription>无法获取用户权限。</AlertDescription>
              </Alert>
              <Button variant="outline" size="sm" onClick={() => { void sendPerms(); }}>
                重试
              </Button>
            </div>
          )
        : permsLoading
          ? <PermissionsSkeleton />
          : (
              <>
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-medium">有效权限</h4>
                  {effectivePerms === undefined || effectivePerms.length === 0
                    ? (
                        <Empty>
                          <EmptyMedia variant="icon">
                            <KeyRound />
                          </EmptyMedia>
                          <EmptyHeader>
                            <EmptyTitle>暂无权限</EmptyTitle>
                            <EmptyDescription>该用户在此组织下没有有效权限。</EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )
                    : (
                        <div className="flex flex-wrap gap-2">
                          {effectivePerms.map(perm => (
                            <Badge key={perm} variant="secondary">{perm}</Badge>
                          ))}
                        </div>
                      )}
                </div>

                <div className="flex flex-col gap-3 border-t pt-4">
                  <h4 className="text-sm font-medium">授予角色</h4>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="role-select">选择角色</FieldLabel>
                      <Select
                        items={roleItems}
                        value={selectedRoleId === "" ? null : selectedRoleId}
                        onValueChange={(val) => { setSelectedRoleId(val ?? ""); }}
                      >
                        <SelectTrigger id="role-select" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {roleItems.map(item => (
                              <SelectItem key={item.value ?? "none"} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                  <div className="flex justify-end">
                    <Button disabled={selectedRoleId === "" || assigning} onClick={() => { void assignRole(); }}>
                      {assigning && <Spinner data-icon="inline-start" />}
                      <ShieldCheck />
                      授予
                    </Button>
                  </div>
                </div>
              </>
            )}
    </DialogContent>
  );
}

function PermissionsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
