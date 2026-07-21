import type { UserOrgOption } from "./user-form";
import type { Permission, Role, UserDirectPermission, UserRoleAssignment, UserSummary } from "@/api/globals";
import { useRequest } from "alova/client";
import { format } from "date-fns";
import { Ban, CalendarClock, Check, CircleAlert, KeyRound, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCan } from "@/hooks/use-permissions";

interface UserAuthorizationDialogProps {
  user: UserSummary;
  orgId: string;
  /** 可选组织(操作者管理子树内 org,默认 user home org)。切换后查看/管理该 org 的授权。 */
  orgOptions: UserOrgOption[];
  roles: Role[];
}

export function UserAuthorizationDialog({ user, orgId, orgOptions, roles }: UserAuthorizationDialogProps) {
  // 选中查看/管理的组织(默认用户 home org)。切换后重新拉该 org 的有效权限与授权记录,
  // 解决"祖先 org 授的授权在 home org 视角不可见不可撤销"(listUserRoles/listUserDirectPermissions 用 eq(orgId) 直接相等)。
  const [selectedOrgId, setSelectedOrgId] = useState(orgId);
  // assign/revoke 后刷新有效权限区(EffectivePermissionsPanel remount 重发)。
  const [permRefresh, setPermRefresh] = useState(0);
  const refreshPerms = () => setPermRefresh(n => n + 1);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>
          用户授权 ·
          {user.name}
        </DialogTitle>
        <DialogDescription>{user.email}</DialogDescription>
      </DialogHeader>

      <Field>
        <FieldLabel htmlFor="auth-org">组织</FieldLabel>
        <Select
          items={orgOptions}
          value={selectedOrgId}
          onValueChange={(val) => { setSelectedOrgId(val ?? orgId); }}
        >
          <SelectTrigger id="auth-org" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {orgOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <EffectivePermissionsPanel key={`${selectedOrgId}-${permRefresh}`} userId={user.id} orgId={selectedOrgId} />

      <Separator />

      <Tabs defaultValue="roles">
        <TabsList className="w-full">
          <TabsTrigger value="roles">角色授权</TabsTrigger>
          <TabsTrigger value="direct">直接授权</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
          <RoleAssignmentsTab key={selectedOrgId} userId={user.id} orgId={selectedOrgId} roles={roles} onChanged={refreshPerms} />
        </TabsContent>
        <TabsContent value="direct">
          <DirectPermissionsTab key={selectedOrgId} userId={user.id} orgId={selectedOrgId} onChanged={refreshPerms} />
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

/** 有效权限全集(角色 ∪ 直接 allow − 直接 deny,含祖先继承,CTE 计算)。按 selectedOrgId 拉取,org 切换/授权变更时 remount 重发。 */
function EffectivePermissionsPanel({ userId, orgId }: { userId: string; orgId: string }) {
  const {
    data: effectivePerms,
    loading: permsLoading,
    error: permsError,
    send: sendPerms,
  } = useRequest(() => Apis.IAM.listUserPermissions({ pathParams: { userId }, params: { orgId } }));

  return (
    <EffectivePermissions
      loading={permsLoading}
      error={permsError !== null && effectivePerms === undefined}
      perms={effectivePerms}
      onRetry={() => { void sendPerms(); }}
    />
  );
}

// --- 有效权限(顶部共享) ---
function EffectivePermissions({ loading, error, perms, onRetry }: {
  loading: boolean;
  error: boolean;
  perms?: string[];
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取用户权限。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={onRetry}>重试</Button>
      </div>
    );
  }
  if (loading) {
    return <Skeleton className="h-20 w-full" />;
  }
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">有效权限</h4>
      {perms === undefined || perms.length === 0
        ? (
            <Empty>
              <EmptyMedia variant="icon"><KeyRound /></EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>暂无权限</EmptyTitle>
                <EmptyDescription>该用户在此组织下没有有效权限。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        : (
            <div className="flex flex-wrap gap-2">
              {perms.map(perm => <Badge key={perm} variant="secondary">{perm}</Badge>)}
            </div>
          )}
    </div>
  );
}

// --- 角色授权 Tab ---
function RoleAssignmentsTab({ userId, orgId, roles, onChanged }: {
  userId: string;
  orgId: string;
  roles: Role[];
  onChanged: () => void;
}) {
  const canGrant = useCan("assignments.grant");
  const {
    data: assignments,
    loading,
    error,
    send,
  } = useRequest(() => Apis.IAM.listUserRoles({ pathParams: { userId }, params: { orgId } }));

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const roleItems = [
    { label: "请选择角色...", value: null },
    ...roles.map(r => ({ label: r.name, value: r.id })),
  ];

  const refresh = () => {
    void send();
    onChanged();
  };

  const assignRole = async () => {
    if (selectedRoleId === "" || assigning) {
      return;
    }
    setAssigning(true);
    try {
      await Apis.IAM.assignUserRole({
        pathParams: { userId, roleId: selectedRoleId },
        data: { orgId, expiresAt: expiresAt ?? undefined },
      });
      toast.success("角色已授予");
      setSelectedRoleId("");
      setExpiresAt(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "授权失败");
    } finally {
      setAssigning(false);
    }
  };

  const revoke = async (roleId: string) => {
    try {
      await Apis.IAM.deleteUserRole({ pathParams: { userId, roleId }, params: { orgId } });
      toast.success("角色已撤销");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "撤销失败");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">已授角色</h4>
        {loading
          ? <Skeleton className="h-16 w-full" />
          : error
            ? (
                <p className="text-sm text-muted-foreground">
                  加载失败,
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => { void send(); }}>重试</Button>
                </p>
              )
            : assignments === undefined || assignments.length === 0
              ? <p className="text-sm text-muted-foreground">暂无已授角色。</p>
              : (
                  <div className="flex flex-col gap-2">
                    {assignments.map(a => (
                      <RoleAssignmentRow key={a.roleId} assignment={a} onRevoke={() => { void revoke(a.roleId); }} />
                    ))}
                  </div>
                )}
      </div>

      <Separator />
      <div className="flex flex-col gap-2">
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
          <Field>
            <FieldLabel htmlFor="role-expires">过期时间(可选)</FieldLabel>
            <DatePicker id="role-expires" value={expiresAt} onChange={setExpiresAt} />
          </Field>
        </FieldGroup>
        <div className="flex justify-end">
          <Button disabled={!canGrant || selectedRoleId === "" || assigning} onClick={() => { void assignRole(); }}>
            {assigning && <Spinner data-icon="inline-start" />}
            <ShieldCheck />
            授予
          </Button>
        </div>
      </div>
    </div>
  );
}

function RoleAssignmentRow({ assignment, onRevoke }: { assignment: UserRoleAssignment; onRevoke: () => void }) {
  const canRevoke = useCan("assignments.revoke");
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{assignment.roleName}</span>
        {assignment.expiresAt != null && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3" />
            {format(new Date(assignment.expiresAt), "yyyy-MM-dd")}
          </span>
        )}
      </div>
      {canRevoke && (
        <Button variant="ghost" size="sm" onClick={onRevoke}>
          <X />
          撤销
        </Button>
      )}
    </div>
  );
}

// --- 直接授权 Tab ---
function DirectPermissionsTab({ userId, orgId, onChanged }: {
  userId: string;
  orgId: string;
  onChanged: () => void;
}) {
  const canGrant = useCan("assignments.grant");
  const { data: catalog } = useRequest(() => Apis.IAM.listPermissions());
  const {
    data: directPerms,
    loading,
    error,
    send,
  } = useRequest(() => Apis.IAM.listUserDirectPermissions({ pathParams: { userId }, params: { orgId } }));

  const [selectedPermission, setSelectedPermission] = useState("");
  const [effect, setEffect] = useState<"allow" | "deny">("allow");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const permItems = [
    { label: "请选择权限...", value: null },
    ...(catalog ?? []).map((p: Permission) => ({ label: p.name, value: p.name })),
  ];

  const refresh = () => {
    void send();
    onChanged();
  };

  const assignPermission = async () => {
    if (selectedPermission === "" || assigning) {
      return;
    }
    setAssigning(true);
    try {
      await Apis.IAM.assignUserPermission({
        pathParams: { userId, permission: selectedPermission },
        data: { orgId, effect, expiresAt: expiresAt ?? undefined },
      });
      toast.success(`${effect === "deny" ? "已拒绝" : "已允许"} ${selectedPermission}`);
      setSelectedPermission("");
      setEffect("allow");
      setExpiresAt(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "授权失败");
    } finally {
      setAssigning(false);
    }
  };

  const revoke = async (permission: string) => {
    try {
      await Apis.IAM.deleteUserPermission({ pathParams: { userId, permission }, params: { orgId } });
      toast.success("直接权限已撤销");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "撤销失败");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">已授直接权限</h4>
        {loading
          ? <Skeleton className="h-16 w-full" />
          : error
            ? (
                <p className="text-sm text-muted-foreground">
                  加载失败,
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => { void send(); }}>重试</Button>
                </p>
              )
            : directPerms === undefined || directPerms.length === 0
              ? <p className="text-sm text-muted-foreground">暂无直接授权。</p>
              : (
                  <div className="flex flex-col gap-2">
                    {directPerms.map(p => (
                      <DirectPermissionRow key={p.permission} perm={p} onRevoke={() => { void revoke(p.permission); }} />
                    ))}
                  </div>
                )}
      </div>

      <Separator />
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">授予直接权限</h4>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="perm-select">选择权限</FieldLabel>
            <Select
              items={permItems}
              value={selectedPermission === "" ? null : selectedPermission}
              onValueChange={(val) => { setSelectedPermission(val ?? ""); }}
            >
              <SelectTrigger id="perm-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {permItems.map(item => (
                    <SelectItem key={item.value ?? "none"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>效果</FieldLabel>
            <ToggleGroup
              value={[effect]}
              onValueChange={(val) => {
                // Base UI ToggleGroup 是多值数组;effect 二选一,取最后选中的值
                const next = val[val.length - 1];
                if (next != null) {
                  setEffect(next as "allow" | "deny");
                }
              }}
            >
              <ToggleGroupItem value="allow">
                <Check className="size-3.5" />
                允许
              </ToggleGroupItem>
              <ToggleGroupItem value="deny">
                <Ban className="size-3.5" />
                拒绝
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="perm-expires">过期时间(可选)</FieldLabel>
            <DatePicker id="perm-expires" value={expiresAt} onChange={setExpiresAt} />
          </Field>
        </FieldGroup>
        <div className="flex justify-end">
          <Button disabled={!canGrant || selectedPermission === "" || assigning} onClick={() => { void assignPermission(); }}>
            {assigning && <Spinner data-icon="inline-start" />}
            <ShieldCheck />
            授予
          </Button>
        </div>
      </div>
    </div>
  );
}

function DirectPermissionRow({ perm, onRevoke }: { perm: UserDirectPermission; onRevoke: () => void }) {
  const canRevoke = useCan("assignments.revoke");
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{perm.permission}</span>
          <Badge variant={perm.effect === "deny" ? "destructive" : "secondary"}>
            {perm.effect === "deny" ? "拒绝" : "允许"}
          </Badge>
        </div>
        {perm.expiresAt != null && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3" />
            {format(new Date(perm.expiresAt), "yyyy-MM-dd")}
          </span>
        )}
      </div>
      {canRevoke && (
        <Button variant="ghost" size="sm" onClick={onRevoke}>
          <X />
          撤销
        </Button>
      )}
    </div>
  );
}
