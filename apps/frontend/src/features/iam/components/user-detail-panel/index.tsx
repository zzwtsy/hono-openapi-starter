import type { Role, UserSummary } from "@/api/globals";
import { useState } from "react";
import Apis from "@/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/use-permissions";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { IAM_ACTIONS, refreshIam } from "../../lib/iam-actions";
import { DirectPermissionsTab } from "./direct-permissions-tab";
import { EffectivePermissionsPanel } from "./effective-permissions-panel";
import { RoleAssignmentsTab } from "./role-assignments-tab";
import { UserDialogs } from "./user-dialogs";
import { UserInfoTab } from "./user-info-tab";

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

export function UserDetailPanel({ user, orgId, onOrgIdChange, orgOptions, getOrgPath, currentUserId, roles, tab, onTabChange, onNavigateRole }: UserDetailPanelProps) {
  const canUpdate = useCan("users.update");
  const canReset = useCan("users.reset-password");
  const canDisable = useCan("users.disable");
  const canEnable = useCan("users.enable");

  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const { mutate: runWithToast } = useToastMutation();

  const enableUser = async () => {
    const ok = await runWithToast(
      () => Apis.IAM.enableUser({ pathParams: { userId: user.id } }),
      { successMessage: "用户已启用", errorMessage: "启用失败" },
    );
    if (ok) {
      refreshIam(IAM_ACTIONS.usersList);
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
              onTransfer={() => { setTransferring(true); }}
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

      <UserDialogs
        user={user}
        editing={editing}
        resetting={resetting}
        disabling={disabling}
        transferring={transferring}
        orgOptions={orgOptions}
        getOrgPath={getOrgPath}
        onEditingChange={setEditing}
        onResettingChange={setResetting}
        onDisablingChange={setDisabling}
        onTransferringChange={setTransferring}
      />
    </Card>
  );
}
