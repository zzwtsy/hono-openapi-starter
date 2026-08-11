import type { PermissionRef, Role } from "@/api/globals";
import type { PermissionCode } from "@/types/permissions";
import { KeyRound, LockKeyhole, Search } from "lucide-react";
import { AsyncListState } from "@/components/shared/async-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { PermissionGroupLayout } from "../../permission-group-layout";
import { useRolePermissions } from "./use-role-permissions";

interface RolePermissionsTabProps {
  role: Role;
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

interface PermissionGroupProps {
  resource: string;
  perms: PermissionRef[];
  initial: Set<PermissionCode>;
  working: Set<PermissionCode>;
  canChange: (permissionCode: PermissionCode, target: boolean) => boolean;
  toggle: (permissionCode: PermissionCode) => void;
  toggleAllInGroup: (perms: PermissionRef[], select: boolean) => void;
}

function PermissionGroup({
  resource,
  perms,
  initial,
  working,
  canChange,
  toggle,
  toggleAllInGroup,
}: PermissionGroupProps) {
  const allSelected = perms.every(p => working.has(p.code));
  const anySelected = perms.some(p => working.has(p.code));
  const resourceLabel = perms[0]?.resourceLabel ?? resource;

  return (
    <FieldSet className="mb-4 break-inside-avoid rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          indeterminate={anySelected && !allSelected}
          disabled={!perms.some(p => canChange(p.code, !allSelected))}
          aria-label={`全选当前结果 ${resourceLabel}`}
          onCheckedChange={() => { toggleAllInGroup(perms, !allSelected); }}
        />
        <FieldLegend variant="label" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {resourceLabel}
        </FieldLegend>
      </div>
      <div className="flex flex-col gap-2">
        {perms.map((perm) => {
          const isAdd = working.has(perm.code) && !initial.has(perm.code);
          const isRemove = !working.has(perm.code) && initial.has(perm.code);
          return (
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
          );
        })}
      </div>
    </FieldSet>
  );
}

export function RolePermissionsTab({ role }: RolePermissionsTabProps) {
  const {
    canRead,
    canEdit,
    canChange,
    allPerms,
    loading,
    error,
    initial,
    working,
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
  } = useRolePermissions(role);

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
      </div>

      {!canEdit && (
        <Alert>
          <LockKeyhole />
          <AlertTitle>权限只读</AlertTitle>
          <AlertDescription>
            {role.source === "code"
              ? "代码角色的权限由应用代码定义，无法在此修改。"
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
          ? (
              <Empty>
                <EmptyMedia variant="icon">
                  <KeyRound />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>{search.trim() === "" ? "无权限" : "无匹配权限"}</EmptyTitle>
                  <EmptyDescription>{search.trim() === "" ? "权限目录为空。" : "换个关键词或筛选条件试试。"}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
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
                      />
                    ))}
                  </PermissionGroupLayout>
                </div>
                {hasChanges && (
                  <div className="flex shrink-0 flex-col gap-3">
                    <Separator />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        新增
                        {" "}
                        {toAdd.length}
                        {" "}
                        · 撤销
                        {" "}
                        {toRemove.length}
                      </p>
                      <Button type="button" size="sm" disabled={submitting} onClick={() => { void submit(); }}>
                        {submitting && <Spinner data-icon="inline-start" />}
                        保存
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
      </AsyncListState>
    </div>
  );
}
