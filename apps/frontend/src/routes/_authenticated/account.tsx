import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/page-header";
import { AccountPage } from "@/features/account/components/account-page";

// 账户设置(自助):仅需认证(已在 _authenticated 层守卫),无需任何权限。
// session 在 _authenticated beforeLoad 已校验;user 经 getMe 下钻到 context.auth.user。
export const Route = createFileRoute("/_authenticated/account")({
  component: AccountRoute,
});

function AccountRoute() {
  const { user } = Route.useRouteContext({ select: c => c.auth });
  if (user == null) {
    return null;
  }
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto p-6">
      <PageHeader title="账户设置" description="管理你的显示名、密码和授权来源。" />
      <AccountPage user={user} />
    </div>
  );
}
