import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsPage } from "@/features/settings/components/SettingsPage";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/settings")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "settings.read");
  },
  loader: async () => {
    await Apis.Settings.listSettings();
  },
  component: () => (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title="系统设置" description="运行时可编辑的配置项。" />
      <SettingsPage />
    </div>
  ),
});
