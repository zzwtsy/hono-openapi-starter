import type { ReactNode } from "react";
import type { UserAccessView, UserDetailTab } from "../../hooks/use-user-selection";
import type { IamDetailMode } from "../iam-workbench";
import type { Role, UserSummary } from "@/api/globals";
import { Ban, CircleCheck, KeyRound, Pencil, Shuffle } from "lucide-react";
import { useState } from "react";
import Apis from "@/api";
import { ResourceActions } from "@/components/shared/resource-actions";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { hasPermission } from "@/lib/permissions";
import { useIamUserCapabilities, useTargetCapabilities } from "../../hooks/use-iam-capabilities";
import { IAM_ACTIONS, refreshIam } from "../../lib/iam-actions";
import { IamDetailSurface } from "../iam-detail-surface";
import { UserAccessPanel } from "./user-access-panel";
import { UserDialogs } from "./user-dialogs";
import { UserInfoTab } from "./user-info-tab";

interface OrgOption {
  label: string;
  value: string;
}

interface UserDetailPanelProps {
  mode: IamDetailMode;
  user: UserSummary;
  orgId: string;
  onOrgIdChange: (orgId: string) => void;
  orgOptions: OrgOption[];
  getOrgPath: (orgId: string) => string;
  currentUserId: string;
  roles: Role[];
  tab: UserDetailTab;
  accessView: UserAccessView;
  onTabChange: (tab: UserDetailTab) => void;
  onAccessViewChange: (view: UserAccessView) => void;
  onNavigateRole: (roleId: string, orgId?: string) => void;
  onTransferred?: (newOrgId: string) => void;
  /** 操作历史 Tab 内容(由 routes 层传入,避免 features 间依赖)。 */
  auditTabContent?: ReactNode;
}

interface UserDetailTabsProps {
  user: UserSummary;
  orgId: string;
  currentUserId: string;
  getOrgPath: (orgId: string) => string;
  canReadAssignments: boolean;
  activeTab: UserDetailTab;
  accessView: UserAccessView;
  onTabChange: (tab: UserDetailTab) => void;
  onAccessViewChange: (view: UserAccessView) => void;
  orgOptions: OrgOption[];
  roles: Role[];
  onNavigateRole: (roleId: string, orgId?: string) => void;
  onOrgIdChange: (orgId: string) => void;
  auditTabContent?: ReactNode;
}

function UserDetailTabs({
  user,
  orgId,
  currentUserId,
  getOrgPath,
  canReadAssignments,
  activeTab,
  accessView,
  onTabChange,
  onAccessViewChange,
  orgOptions,
  roles,
  onNavigateRole,
  onOrgIdChange,
  auditTabContent,
}: UserDetailTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={value => onTabChange(value as UserDetailTab)} className="min-h-0 flex-1">
      <div className="shrink-0 overflow-x-auto pb-1">
        <TabsList variant="line" className="min-w-max justify-start">
          <TabsTrigger value="overview">概览</TabsTrigger>
          {canReadAssignments && <TabsTrigger value="access">访问权限</TabsTrigger>}
          <TabsTrigger value="audit">操作记录</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="overview" className="min-h-0 flex-1 overflow-y-auto pt-3">
        <div className="max-w-3xl">
          <UserInfoTab user={user} />
        </div>
      </TabsContent>
      {canReadAssignments && (
        <TabsContent value="access" className="min-h-0 flex-1 overflow-y-auto pt-3">
          <UserAccessPanel
            key={`${user.id}:${orgId}`}
            userId={user.id}
            userName={user.name}
            userHomeOrgId={user.orgId}
            orgId={orgId}
            orgOptions={orgOptions}
            currentUserId={currentUserId}
            roles={roles}
            getOrgPath={getOrgPath}
            onOrgIdChange={onOrgIdChange}
            onNavigateRole={onNavigateRole}
            view={accessView}
            onViewChange={onAccessViewChange}
          />
        </TabsContent>
      )}
      <TabsContent value="audit" className="min-h-0 flex-1 overflow-y-auto pt-3">
        <div className="max-w-4xl">{auditTabContent}</div>
      </TabsContent>
    </Tabs>
  );
}

export function UserDetailPanel({
  mode,
  user,
  orgId,
  onOrgIdChange,
  orgOptions,
  getOrgPath,
  currentUserId,
  roles,
  tab,
  accessView,
  onTabChange,
  onAccessViewChange,
  onNavigateRole,
  onTransferred,
  auditTabContent,
}: UserDetailPanelProps) {
  const targetCapabilities = useTargetCapabilities(user.orgId).data?.permissionCodes;
  const canUpdate = hasPermission(targetCapabilities, "users.update");
  const canReset = hasPermission(targetCapabilities, "users.reset-password");
  const canDisable = hasPermission(targetCapabilities, "users.disable");
  const canEnable = hasPermission(targetCapabilities, "users.enable");
  const { canReadAssignments } = useIamUserCapabilities(currentUserId, user.id, user.orgId, orgId);

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
  const activeTab: UserDetailTab = !canReadAssignments && tab === "access" ? "overview" : tab;
  const actions = [
    { id: "edit", allowed: canUpdate, label: "编辑", icon: Pencil, onClick: () => { setEditing(true); } },
    { id: "transfer", allowed: canUpdate && !isSelf, label: "调岗", icon: Shuffle, onClick: () => { setTransferring(true); } },
    { id: "reset", allowed: canReset, label: "重置密码", icon: KeyRound, onClick: () => { setResetting(true); } },
    {
      id: "disable",
      allowed: canDisable && !disabled && !isSelf,
      label: "禁用",
      icon: Ban,
      variant: "destructive" as const,
      onClick: () => { setDisabling(true); },
    },
    { id: "enable", allowed: canEnable && disabled, label: "启用", icon: CircleCheck, onClick: () => { void enableUser(); } },
  ];

  return (
    <IamDetailSurface
      mode={mode}
      title={user.name}
      description={(
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate">{user.email}</span>
          <span className="truncate text-xs">
            归属组织：
            <span className="font-medium text-foreground">{user.orgId != null ? getOrgPath(user.orgId) : "未分配"}</span>
          </span>
        </div>
      )}
      status={disabled
        ? <Badge variant="destructive">已禁用</Badge>
        : <Badge variant="secondary">正常</Badge>}
      actions={<ResourceActions label={`${user.name} 的操作`} items={actions} />}
    >
      <UserDetailTabs
        user={user}
        orgId={orgId}
        currentUserId={currentUserId}
        getOrgPath={getOrgPath}
        canReadAssignments={canReadAssignments}
        activeTab={activeTab}
        accessView={accessView}
        onTabChange={onTabChange}
        onAccessViewChange={onAccessViewChange}
        orgOptions={orgOptions}
        roles={roles}
        onNavigateRole={onNavigateRole}
        onOrgIdChange={onOrgIdChange}
        auditTabContent={auditTabContent}
      />

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
        onTransferred={onTransferred}
      />
    </IamDetailSurface>
  );
}
