import { createFileRoute } from "@tanstack/react-router";
import Apis from "@/api";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { requirePermission } from "@/lib/require-permission";

export const Route = createFileRoute("/_authenticated/settings")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "settings.read");
  },
  loader: async () => {
    await Apis.Settings.listSettings();
  },
  component: Settings,
});

function Settings() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto p-6">
      <PageHeader title="系统设置" description="运行时可编辑的配置项。" />
      <SettingsPage />
    </div>
  );
}
