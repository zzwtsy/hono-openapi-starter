import type { EffectivePermission, PermissionSource, Role, UserSummary } from "@/api/globals";
import { actionDelegationMiddleware, useRequest, useWatcher } from "alova/client";
import { format } from "date-fns";
import { Ban, CalendarClock, Check, ChevronRight, CircleAlert, CircleCheck, KeyRound, Pencil, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { Can } from "@/components/can";
import { DatePicker } from "@/components/shared/date-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCan } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/utils";
import { IAM_ACTIONS, refreshIam } from "../iam-actions";
import { PermissionCombobox } from "./permission-combobox";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { UserForm } from "./user-form";

interface OrgOption {
  label: string;
  value: string;
}

interface UserDetailPanelProps {
  user: UserSummary;
  orgId: string;
  onOrgIdChange: (orgId: string) => void;
  orgOptions: OrgOption[];
  getOrgPath: (orgId: string) => string;
  currentUserId: string;
  roles: Role[];
  tab: string;
  onTabChange: (tab: string) => void;
  onNavigateRole: (roleId: string) => void;
}

function groupByResource(perms: EffectivePermission[]): Map<string, EffectivePermission[]> {
  const groups = new Map<string, EffectivePermission[]>();
  for (const p of perms) {
    const resource = p.permission.split(".")[0] ?? "other";
    const list = groups.get(resource);
    if (list === undefined) {
      groups.set(resource, [p]);
    } else {
      list.push(p);
    }
  }
  return groups;
}

export function UserDetailPanel({ user, orgId, onOrgIdChange, orgOptions, getOrgPath, currentUserId, roles, tab, onTabChange, onNavigateRole }: UserDetailPanelProps) {
  const canUpdate = useCan("users.update");
  const canReset = useCan("users.reset-password");
  const canDisable = useCan("users.disable");
  const canEnable = useCan("users.enable");

  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [disablingBusy, setDisablingBusy] = useState(false);

  const handleEditSuccess = () => {
    setEditing(false);
    refreshIam(IAM_ACTIONS.usersList);
  };

  const handleResetSuccess = () => {
    setResetting(false);
  };

  const confirmDisable = async () => {
    setDisablingBusy(true);
    try {
      await Apis.IAM.disableUser({ pathParams: { userId: user.id } });
      toast.success("用户已禁用");
      setDisabling(false);
      refreshIam(IAM_ACTIONS.usersList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "禁用失败");
    } finally {
      setDisablingBusy(false);
    }
  };

  const enableUser = async () => {
    try {
      await Apis.IAM.enableUser({ pathParams: { userId: user.id } });
      toast.success("用户已启用");
      refreshIam(IAM_ACTIONS.usersList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "启用失败");
    }
  };

  const disabled = user.disabled === true;
  const isSelf = user.id === currentUserId;

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex h-full min-h-0 flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-lg font-medium">{user.name}</span>
            <span className="truncate text-sm text-muted-foreground">{user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            {disabled
              ? <Badge variant="destructive">已禁用</Badge>
              : <Badge variant="secondary">正常</Badge>}
          </div>
        </div>

        <Field>
          <FieldLabel htmlFor="org-select">授权视角组织</FieldLabel>
          <Select
            items={orgOptions}
            value={orgId}
            onValueChange={(val) => {
              if (val != null) {
                onOrgIdChange(val);
              }
            }}
          >
            <SelectTrigger id="org-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {orgOptions.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Tabs value={tab} onValueChange={onTabChange} className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="info">信息</TabsTrigger>
            <TabsTrigger value="roles">角色授权</TabsTrigger>
            <TabsTrigger value="direct">直接授权</TabsTrigger>
            <TabsTrigger value="effective">有效权限</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="min-h-0 flex-1 overflow-y-auto">
            <UserInfoTab
              user={user}
              canUpdate={canUpdate}
              canReset={canReset}
              canDisable={canDisable}
              canEnable={canEnable}
              disabled={disabled}
              isSelf={isSelf}
              onEdit={() => { setEditing(true); }}
              onReset={() => { setResetting(true); }}
              onDisable={() => { setDisabling(true); }}
              onEnable={() => { void enableUser(); }}
            />
          </TabsContent>
          <TabsContent value="roles" className="min-h-0 flex-1 overflow-y-auto">
            <RoleAssignmentsTab
              userId={user.id}
              orgId={orgId}
              roles={roles}
              onNavigateRole={onNavigateRole}
            />
          </TabsContent>
          <TabsContent value="direct" className="min-h-0 flex-1 overflow-y-auto">
            <DirectPermissionsTab userId={user.id} orgId={orgId} />
          </TabsContent>
          <TabsContent value="effective" className="min-h-0 flex-1 overflow-y-auto">
            <EffectivePermissionsPanel
              userId={user.id}
              orgId={orgId}
              getOrgPath={getOrgPath}
              onNavigateRole={onNavigateRole}
              onOrgIdChange={onOrgIdChange}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          {editing && <UserForm key={user.id} user={user} onSuccess={handleEditSuccess} />}
        </DialogContent>
      </Dialog>

      <Dialog open={resetting} onOpenChange={setResetting}>
        <DialogContent>
          {resetting && <ResetPasswordDialog key={user.id} user={user} onSuccess={handleResetSuccess} />}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={disabling}
        onOpenChange={(o) => {
          if (o || !disablingBusy) {
            setDisabling(o);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>禁用用户</AlertDialogTitle>
            <AlertDialogDescription>
              {`确认禁用用户「${user.name}」?对方将立即下线且无法重新登录,直至重新启用。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disablingBusy}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={disablingBusy}
              onClick={() => { void confirmDisable(); }}
            >
              {disablingBusy && <Spinner data-icon="inline-start" />}
              禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function UserInfoTab({ user, canUpdate, canReset, canDisable, canEnable, disabled, isSelf, onEdit, onReset, onDisable, onEnable }: {
  user: UserSummary;
  canUpdate: boolean;
  canReset: boolean;
  canDisable: boolean;
  canEnable: boolean;
  disabled: boolean;
  isSelf: boolean;
  onEdit: () => void;
  onReset: () => void;
  onDisable: () => void;
  onEnable: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">用户名</dt>
          <dd className="font-medium">{user.name}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">邮箱</dt>
          <dd className="font-medium">{user.email}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">状态</dt>
          <dd>
            {disabled
              ? <Badge variant="destructive">已禁用</Badge>
              : <Badge variant="secondary">正常</Badge>}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">创建时间</dt>
          <dd className="font-medium">{formatDate(user.createdAt)}</dd>
        </div>
      </dl>

      <Separator />

      <div className="flex flex-wrap gap-2">
        {canUpdate && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil data-icon="inline-start" />
            编辑
          </Button>
        )}
        {canReset && (
          <Button variant="outline" size="sm" onClick={onReset}>
            <KeyRound data-icon="inline-start" />
            重置密码
          </Button>
        )}
        {canDisable && !disabled && !isSelf && (
          <Button variant="outline" size="sm" onClick={onDisable}>
            <Ban data-icon="inline-start" />
            禁用
          </Button>
        )}
        {canEnable && disabled && (
          <Button variant="outline" size="sm" onClick={onEnable}>
            <CircleCheck data-icon="inline-start" />
            启用
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 有效权限面板:后端 listUserPermissions 直接返回带来源链的结构
 * (effective + denied),无需前端 N+1 拼。来源 badge 可点击跳转。
 */
function EffectivePermissionsPanel({ userId, orgId, getOrgPath, onNavigateRole, onOrgIdChange }: {
  userId: string;
  orgId: string;
  getOrgPath: (orgId: string) => string;
  onNavigateRole: (roleId: string) => void;
  onOrgIdChange: (orgId: string) => void;
}) {
  const {
    data: result,
    loading,
    error,
    send,
  } = useRequest(
    () => Apis.IAM.listUserPermissions({ pathParams: { userId }, params: { orgId } }),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.userPermissions) },
  );

  if (error !== null && result === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取用户权限。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => { void send(); }}>重试</Button>
      </div>
    );
  }
  if (loading && result === undefined) {
    return <Skeleton className="h-20 w-full" />;
  }

  const effective = result?.effective ?? [];
  const denied = result?.denied ?? [];
  const groups = groupByResource(effective);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">有效权限</h4>
        {effective.length === 0
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
              <div className="flex flex-col gap-3">
                {[...groups.entries()].map(([resource, perms]) => (
                  <div key={resource} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{resource}</span>
                    <div className="flex flex-col gap-1.5">
                      {perms.map(p => (
                        <div key={p.permission} className="flex flex-wrap items-center gap-1.5 text-sm">
                          <span>{p.permission}</span>
                          {p.sources.map(s => (
                            <SourceBadge
                              key={`${s.type}-${s.roleId ?? "direct"}-${s.orgId}`}
                              source={s}
                              getOrgPath={getOrgPath}
                              onNavigateRole={onNavigateRole}
                              onOrgIdChange={onOrgIdChange}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>

      {denied.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-muted-foreground">已被拒绝(deny 抵消)</h4>
            <p className="text-xs text-muted-foreground">以下权限本会生效,但被直接 deny 扣掉。撤销对应 deny 可恢复。</p>
            <div className="flex flex-col gap-1.5">
              {denied.map(d => (
                <div key={d.permission} className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground line-through">{d.permission}</span>
                  <Badge variant="destructive" className="text-xs">已被拒绝</Badge>
                  {d.suppressedSources.map(s => (
                    <SourceBadge
                      key={`denied-${s.type}-${s.roleId ?? "direct"}-${s.orgId}`}
                      source={s}
                      getOrgPath={getOrgPath}
                      onNavigateRole={onNavigateRole}
                      onOrgIdChange={onOrgIdChange}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground">
                    被
                    {" "}
                    {d.deniedBy.map(d => getOrgPath(d.orgId)).join("、")}
                    {" "}
                    拒绝
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SourceBadge({ source, getOrgPath, onNavigateRole, onOrgIdChange }: {
  source: PermissionSource;
  getOrgPath: (orgId: string) => string;
  onNavigateRole: (roleId: string) => void;
  onOrgIdChange: (orgId: string) => void;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {source.type === "role"
        ? (
            <Tooltip>
              <TooltipTrigger render={
                <Badge variant="secondary" className="text-xs hover:bg-accent" />
              }
              >
                <button
                  type="button"
                  className="cursor-pointer"
                  onClick={() => { onNavigateRole(source.roleId!); }}
                >
                  {source.roleName}
                </button>
              </TooltipTrigger>
              <TooltipContent>查看角色详情</TooltipContent>
            </Tooltip>
          )
        : <Badge variant="secondary" className="text-xs">直接</Badge>}
      <Tooltip>
        <TooltipTrigger render={
          <Badge variant="outline" className="text-xs text-muted-foreground hover:bg-accent" />
        }
        >
          <button
            type="button"
            className="cursor-pointer"
            onClick={() => { onOrgIdChange(source.orgId); }}
          >
            @
            {getOrgPath(source.orgId)}
          </button>
        </TooltipTrigger>
        <TooltipContent>切到此组织视角</TooltipContent>
      </Tooltip>
      {source.expiresAt != null && (
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
          <CalendarClock className="size-3" />
          {format(new Date(source.expiresAt), "yyyy-MM-dd")}
        </span>
      )}
    </span>
  );
}

// --- 角色授权 Tab ---
function RoleAssignmentsTab({ userId, orgId, roles, onNavigateRole }: {
  userId: string;
  orgId: string;
  roles: Role[];
  onNavigateRole: (roleId: string) => void;
}) {
  const canGrant = useCan("assignments.grant");
  const {
    data: assignments,
    loading,
    error,
    send,
  } = useRequest(
    () => Apis.IAM.listUserRoles({ pathParams: { userId }, params: { orgId } }),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.userRoles) },
  );
  // 当前有效权限(与 EffectivePermissionsPanel 同 key,alova 自动共享缓存),用于授予预览
  const { data: effectiveResult } = useRequest(
    () => Apis.IAM.listUserPermissions({ pathParams: { userId }, params: { orgId } }),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.userPermissions) },
  );

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  // useWatcher 监听 selectedRoleId:选中角色自动用新 roleId 拉权限,
  // 修此前 sendPreview 闭包用旧 roleId(初始 "")-> 404 -> 显示 0 项权限的 bug。
  const { data: previewPerms } = useWatcher(
    () => Apis.IAM.listRolePermissions({ pathParams: { roleId: selectedRoleId } }),
    [selectedRoleId],
    { immediate: false },
  );
  // 授予后将新增哪些权限(用户当前未持有)
  const newPerms = useMemo(() => {
    if (previewPerms === undefined || effectiveResult === undefined) {
      return undefined;
    }
    const have = new Set(effectiveResult.effective.map(p => p.permission));
    return previewPerms.filter(p => !have.has(p));
  }, [previewPerms, effectiveResult]);

  const roleItems = [
    { label: "请选择角色...", value: null },
    ...roles.map(r => ({ label: r.name, value: r.id })),
  ];

  const refresh = () => {
    refreshIam(IAM_ACTIONS.userRoles, IAM_ACTIONS.userPermissions);
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
                      <RoleAssignmentRow key={a.roleId} assignment={a} onRevoke={() => { void revoke(a.roleId); }} onNavigateRole={onNavigateRole} />
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
              onValueChange={(val) => {
                setSelectedRoleId(val ?? "");
              }}
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
          {selectedRoleId !== "" && (
            <Collapsible className="group/collapsible">
              <CollapsibleTrigger render={<Button variant="ghost" size="sm" className="w-full justify-start" />}>
                <ChevronRight className="size-4 transition-transform group-data-open/collapsible:rotate-90" />
                <span>
                  该角色含
                  {" "}
                  {previewPerms?.length ?? 0}
                  {" "}
                  项权限
                  {newPerms !== undefined && newPerms.length > 0 && ` · 授予后新增 ${newPerms.length} 项`}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-1 rounded-lg border p-2">
                  {previewPerms === undefined || previewPerms.length === 0
                    ? <span className="text-sm text-muted-foreground">该角色暂无权限</span>
                    : previewPerms.map(p => (
                        <Badge
                          key={p}
                          variant={(newPerms?.includes(p) ?? false) ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {p}
                        </Badge>
                      ))}
                </div>
                {newPerms !== undefined && newPerms.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">高亮为用户当前未持有的新增权限。</p>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
          <Field>
            <FieldLabel htmlFor="role-expires">过期时间(可选)</FieldLabel>
            <DatePicker id="role-expires" value={expiresAt} onChange={setExpiresAt} />
            <p className="text-xs text-muted-foreground">留空=永不过期(新授)/保留原值(续期);暂不支持从有限期改回永不过期。</p>
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

function RoleAssignmentRow({ assignment, onRevoke, onNavigateRole }: {
  assignment: { roleId: string; roleName: string; orgId: string; expiresAt: string | null };
  onRevoke: () => void;
  onNavigateRole: (roleId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          className="text-left text-sm font-medium hover:underline"
          onClick={() => { onNavigateRole(assignment.roleId); }}
        >
          {assignment.roleName}
        </button>
        {assignment.expiresAt != null && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3" />
            {format(new Date(assignment.expiresAt), "yyyy-MM-dd")}
          </span>
        )}
      </div>
      <Can permission="assignments.revoke">
        <Button variant="ghost" size="sm" onClick={onRevoke}>
          <X />
          撤销
        </Button>
      </Can>
    </div>
  );
}

// --- 直接授权 Tab ---
function DirectPermissionsTab({ userId, orgId }: {
  userId: string;
  orgId: string;
}) {
  const canGrant = useCan("assignments.grant");
  const { data: catalog } = useRequest(() => Apis.IAM.listPermissions());
  const {
    data: directPerms,
    loading,
    error,
    send,
  } = useRequest(
    () => Apis.IAM.listUserDirectPermissions({ pathParams: { userId }, params: { orgId } }),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.userDirectPerms) },
  );

  const [selectedPermission, setSelectedPermission] = useState("");
  const [effect, setEffect] = useState<"allow" | "deny">("allow");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const refresh = () => {
    refreshIam(IAM_ACTIONS.userDirectPerms, IAM_ACTIONS.userPermissions);
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
            <PermissionCombobox
              value={selectedPermission === "" ? null : selectedPermission}
              onChange={setSelectedPermission}
              permissions={catalog ?? []}
            />
          </Field>
          <Field>
            <FieldLabel>效果</FieldLabel>
            <ToggleGroup
              value={[effect]}
              onValueChange={(val) => {
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

function DirectPermissionRow({ perm, onRevoke }: {
  perm: { permission: string; effect: "allow" | "deny"; orgId: string; expiresAt: string | null };
  onRevoke: () => void;
}) {
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
      <Can permission="assignments.revoke">
        <Button variant="ghost" size="sm" onClick={onRevoke}>
          <X />
          撤销
        </Button>
      </Can>
    </div>
  );
}
