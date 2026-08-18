import type { UserAccessView } from "../../hooks/use-user-selection";
import type { Role } from "@/api/globals";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIamUserCapabilities } from "../../hooks/use-iam-capabilities";
import { useUserAccessData } from "../../hooks/use-user-access-data";
import { DirectPermissionsTab } from "./direct-permissions-tab";
import { EffectivePermissionsPanel } from "./effective-permissions-panel";
import { RoleAssignmentsTab } from "./role-assignments-tab";

interface OrgOption { label: string; value: string }

interface UserAccessPanelProps {
  userId: string;
  userName: string;
  userHomeOrgId: string;
  orgId: string;
  orgOptions: OrgOption[];
  currentUserId: string;
  roles: Role[];
  view: UserAccessView;
  getOrgPath: (orgId: string) => string;
  onViewChange: (view: UserAccessView) => void;
  onOrgIdChange: (orgId: string) => void;
  onNavigateRole: (roleId: string, orgId?: string) => void;
}

function SummaryValue({ value, loading, error }: { value: number | undefined; loading: boolean; error: unknown }) {
  if (value !== undefined) {
    return (
      <Badge variant="secondary">
        {value}
        {" "}
        项
      </Badge>
    );
  }
  if (error != null)
    return <span className="text-xs text-muted-foreground">加载失败</span>;
  return <span className="text-xs text-muted-foreground">{loading ? "加载中…" : "—"}</span>;
}

export function UserAccessPanel({ userId, userName, userHomeOrgId, orgId, orgOptions, currentUserId, roles, view, getOrgPath, onViewChange, onOrgIdChange, onNavigateRole }: UserAccessPanelProps) {
  const { canReadAssignments } = useIamUserCapabilities(currentUserId, userId, userHomeOrgId, orgId);
  const data = useUserAccessData(userId, orgId, canReadAssignments);
  const roleCount = data.roles.data?.length;
  const directCount = data.directPermissions.data?.length;
  const effectiveCount = data.effectivePermissions.data?.effective.length;

  return (
    <div className="flex min-w-0 max-w-5xl flex-col gap-5">
      <Field>
        <FieldLabel htmlFor="org-select">组织视角</FieldLabel>
        <Select
          items={orgOptions}
          value={orgId}
          onValueChange={(value) => {
            if (value !== null)
              onOrgIdChange(value);
          }}
        >
          <SelectTrigger id="org-select" className="w-full max-w-xl"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup>{orgOptions.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
        </Select>
        <FieldDescription>授权操作作用于此组织。</FieldDescription>
      </Field>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="访问权限摘要">
        <span className="flex items-center gap-2">
          角色授权
          <SummaryValue value={roleCount} loading={data.roles.loading} error={data.roles.error} />
        </span>
        <span className="flex items-center gap-2">
          例外规则
          <SummaryValue value={directCount} loading={data.directPermissions.loading} error={data.directPermissions.error} />
        </span>
        <span className="flex items-center gap-2">
          生效权限
          <SummaryValue value={effectiveCount} loading={data.effectivePermissions.loading} error={data.effectivePermissions.error} />
        </span>
      </div>

      <Separator />

      <Tabs value={view} onValueChange={value => onViewChange(value as UserAccessView)} className="min-w-0">
        <TabsList variant="line">
          <TabsTrigger value="config">授权配置</TabsTrigger>
          <TabsTrigger value="effective">生效结果</TabsTrigger>
        </TabsList>
        <TabsContent value="config" className="flex flex-col gap-5 pt-4">
          <RoleAssignmentsTab
            userId={userId}
            userName={userName}
            userHomeOrgId={userHomeOrgId}
            orgId={orgId}
            orgPath={getOrgPath(orgId)}
            roles={roles}
            currentUserId={currentUserId}
            query={data.roles}
            effectiveResult={data.effectivePermissions.data}
            onNavigateRole={onNavigateRole}
          />
          <Separator />
          <DirectPermissionsTab
            userId={userId}
            userName={userName}
            userHomeOrgId={userHomeOrgId}
            orgId={orgId}
            orgPath={getOrgPath(orgId)}
            currentUserId={currentUserId}
            query={data.directPermissions}
            effectiveResult={data.effectivePermissions.data}
          />
        </TabsContent>
        <TabsContent value="effective" className="pt-4">
          <EffectivePermissionsPanel query={data.effectivePermissions} getOrgPath={getOrgPath} onNavigateRole={onNavigateRole} onOrgIdChange={onOrgIdChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
