import type { Role, UserSummary } from "@/api/globals";
import { useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
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
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/use-permissions";
import { IAM_ACTIONS, refreshIam } from "../../iam-actions";
import { ResetPasswordDialog } from "../reset-password-dialog";
import { UserForm } from "../user-form";
import { DirectPermissionsTab } from "./direct-permissions-tab";
import { EffectivePermissionsPanel } from "./effective-permissions-panel";
import { RoleAssignmentsTab } from "./role-assignments-tab";
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
