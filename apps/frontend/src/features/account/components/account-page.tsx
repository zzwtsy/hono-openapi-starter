import type { Me } from "@/api/globals";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthorizationPanel } from "./authorization-panel";
import { ChangePasswordForm } from "./change-password-form";
import { ProfileForm } from "./profile-form";

interface AccountPageProps {
  user: Me["user"];
}

export function AccountPage({ user }: AccountPageProps) {
  return (
    <Tabs defaultValue="profile" className="gap-4">
      <TabsList>
        <TabsTrigger value="profile">资料</TabsTrigger>
        <TabsTrigger value="password">密码</TabsTrigger>
        <TabsTrigger value="authorization">授权</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">显示名</h2>
          <p className="text-sm text-muted-foreground">修改你的显示名,保存后全站生效。</p>
          <ProfileForm currentName={user.name} />
        </div>
      </TabsContent>
      <TabsContent value="password">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">修改密码</h2>
          <p className="text-sm text-muted-foreground">
            修改密码后将在所有设备退出登录,需使用新密码重新登录。
          </p>
          <ChangePasswordForm />
        </div>
      </TabsContent>
      <TabsContent value="authorization">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">我的授权</h2>
          <p className="text-sm text-muted-foreground">查看角色、直接授权和当前有效权限的来源。</p>
          <AuthorizationPanel />
        </div>
      </TabsContent>
    </Tabs>
  );
}
