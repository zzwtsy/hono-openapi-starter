import type { PermissionRef, Role } from "@/api/globals";
import type { PermissionCode } from "@/types/permissions";
import { KeyRound, LockKeyhole, Pencil, Search } from "lucide-react";
import { useEffect } from "react";
import { AsyncListState } from "@/components/shared/async-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { PermissionGroupLayout } from "../../permission-group-layout";
import { PermissionEditorFooter } from "./permission-editor-footer";
import { useRolePermissions } from "./use-role-permissions";

interface RolePermissionsTabProps {
  role: Role;
  isSystemRootUser: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

// 加载态骨架(组合:搜索栏 + 3 个分组占位),模块级常量避免每次 render 重建。
const PERMISSIONS_LOADING_FALLBACK = (
  <div className="flex flex-col gap-4">
    <Skeleton className="h-9 w-full" />
    {Array.from({ length: 3 }).map((_, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <Skeleton key={`group-${i}`} className="h-20 w-full" />
    ))}
  </div>
);

function PermissionsEmptyState({ editing, search }: { editing: boolean; search: string }) {
  const searching = search.trim() !== "";
  let title = editing ? "无权限" : "暂未授予权限";
  let description = editing ? "权限目录为空。" : "此角色当前没有权限。";
  if (searching) {
    title = "无匹配权限";
    description = "换个关键词或筛选条件试试。";
  }
  return (
    <Empty>
      <EmptyMedia variant="icon"><KeyRound /></EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

interface PermissionGroupProps {
  resource: string;
  perms: PermissionRef[];
  initial: Set<PermissionCode>;
  working: Set<PermissionCode>;
  canChange: (permissionCode: PermissionCode, target: boolean) => boolean;
  toggle: (permissionCode: PermissionCode) => void;
  toggleAllInGroup: (perms: PermissionRef[], select: boolean) => void;
  editing: boolean;
}

function PermissionGroup({
  resource,
  perms,
  initial,
  working,
  canChange,
  toggle,
  toggleAllInGroup,
  editing,
}: PermissionGroupProps) {
  const allSelected = perms.every(p => working.has(p.code));
  const anySelected = perms.some(p => working.has(p.code));
  const resourceLabel = perms[0]?.resourceLabel ?? resource;

  return (
    <FieldSet className="mb-4 break-inside-avoid rounded-lg border p-3">
      <div className="flex items-center gap-2">
        {editing && (
          <Checkbox
            checked={allSelected}
            indeterminate={anySelected && !allSelected}
            disabled={!perms.some(p => canChange(p.code, !allSelected))}
            aria-label={`全选当前结果 ${resourceLabel}`}
            onCheckedChange={() => { toggleAllInGroup(perms, !allSelected); }}
          />
        )}
        <FieldLegend variant="label" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {resourceLabel}
        </FieldLegend>
      </div>
      <div className="flex flex-col gap-2">
        {perms.map((perm) => {
          const isAdd = working.has(perm.code) && !initial.has(perm.code);
          const isRemove = !working.has(perm.code) && initial.has(perm.code);
          return editing
            ? (
                <Field key={perm.code} orientation="horizontal">
                  <Checkbox
                    id={`perm-${perm.code}`}
                    checked={working.has(perm.code)}
                    disabled={!canChange(perm.code, !working.has(perm.code))}
                    onCheckedChange={() => { toggle(perm.code); }}
                  />
                  <FieldLabel htmlFor={`perm-${perm.code}`} className="font-normal">
                    <span className={cn(isRemove && "text-muted-foreground line-through", isAdd && "text-primary font-medium")}>{perm.label}</span>
                    {isAdd && <Badge variant="secondary" className="text-xs">新增</Badge>}
                    {isRemove && <Badge variant="destructive" className="text-xs">撤销</Badge>}
                  </FieldLabel>
                </Field>
              )
            : (
                <div key={perm.code} className="flex items-center py-1 text-sm">
                  <span>{perm.label}</span>
                </div>
              );
        })}
      </div>
    </FieldSet>
  );
}

export function RolePermissionsTab({ role, isSystemRootUser, onDirtyChange }: RolePermissionsTabProps) {
  const {
    canRead,
    canEdit,
    canReadAssignments,
    canChange,
    allPerms,
    loading,
    error,
    initial,
    working,
    editing,
    beginEdit,
    cancelEdit,
    search,
    setSearch,
    viewMode,
    setViewMode,
    groups,
    toAdd,
    toRemove,
    hasChanges,
    toggle,
    toggleAllInGroup,
    retry,
    submit,
    submitting,
    affectedUsers,
    affectedUsersLoading,
    affectedUsersError,
    loadAffectedUsers,
  } = useRolePermissions(role, isSystemRootUser);
  useEffect(() => {
    onDirtyChange?.(editing && hasChanges);
  }, [editing, hasChanges, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  if (!canRead) {
    return (
      <Empty>
        <EmptyMedia variant="icon"><KeyRound /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>无权限</EmptyTitle>
          <EmptyDescription>需要 roles.read 和 permissions.read 才能查看角色权限。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-40 flex-1">
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput
            aria-label="搜索权限"
            placeholder="搜索权限…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </InputGroup>
        {editing && (
          <ToggleGroup
            value={[viewMode]}
            onValueChange={(val) => {
              const next = val[val.length - 1];
              if (next === "all" || next === "selected" || next === "diff") {
                setViewMode(next);
              }
            }}
          >
            <ToggleGroupItem value="all">全部</ToggleGroupItem>
            <ToggleGroupItem value="selected">仅已选</ToggleGroupItem>
            <ToggleGroupItem value="diff">仅差异</ToggleGroupItem>
          </ToggleGroup>
        )}
        {canEdit && !editing && (
          <Button type="button" size="sm" onClick={beginEdit}>
            <Pencil data-icon="inline-start" />
            编辑权限
          </Button>
        )}
      </div>

      {!canEdit && (
        <Alert>
          <LockKeyhole />
          <AlertTitle>权限只读</AlertTitle>
          <AlertDescription>
            {role.source === "code"
              ? "系统内置角色的权限由应用代码定义，无法在此修改。"
              : "当前账号缺少分配或撤销角色权限的权限。"}
          </AlertDescription>
        </Alert>
      )}

      <AsyncListState
        loading={loading}
        error={error}
        data={allPerms}
        onRetry={retry}
        loadingFallback={PERMISSIONS_LOADING_FALLBACK}
        errorDescription="无法获取权限目录或角色权限。"
      >
        {groups.size === 0
          ? <PermissionsEmptyState editing={editing} search={search} />
          : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <PermissionGroupLayout maxColumns={3}>
                    {[...groups.entries()].map(([resource, perms]) => (
                      <PermissionGroup
                        key={resource}
                        resource={resource}
                        perms={perms}
                        initial={initial}
                        working={working}
                        canChange={canChange}
                        toggle={toggle}
                        toggleAllInGroup={toggleAllInGroup}
                        editing={editing}
                      />
                    ))}
                  </PermissionGroupLayout>
                </div>
                {editing && (
                  <PermissionEditorFooter
                    toAddCount={toAdd.length}
                    toRemoveCount={toRemove.length}
                    canReadAssignments={canReadAssignments}
                    affectedUsers={affectedUsers}
                    affectedUsersLoading={affectedUsersLoading}
                    affectedUsersError={affectedUsersError}
                    submitting={submitting}
                    onRetryAffectedUsers={() => { void loadAffectedUsers(); }}
                    onCancel={cancelEdit}
                    onSubmit={() => { void submit(); }}
                  />
                )}
              </>
            )}
      </AsyncListState>
    </div>
  );
}
