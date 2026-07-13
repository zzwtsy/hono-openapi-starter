import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { PageHeader } from "@/components/layout/page-header";
import { UserList } from "@/features/iam/components/UserList";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/iam/users")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "iam.read");
  },
  loader: async () => {
    await Apis.IAM.listUsers();
  },
  component: UsersPage,
});

function UsersPage() {
  const { auth } = Route.useRouteContext();
  const orgId = auth.user?.orgId ?? "";

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title="用户管理" description="管理组织内的用户及其权限。" />
      <UserList orgId={orgId} />
    </div>
  );
}
