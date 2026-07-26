import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/pages/settings";
import Apis from "@/shared/api";
import { requirePermission } from "@/shared/lib/require-permission";

export const Route = createFileRoute("/_authenticated/settings")({
  beforeLoad: ({ context }) => {
    requirePermission(context.auth.permissions, "settings.read");
  },
  loader: async () => {
    await Apis.Settings.listSettings();
  },
  component: SettingsPage,
});
