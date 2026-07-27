import type { LucideIcon } from "lucide-react";
import type { FileRouteTypes } from "@/routeTree.gen";
import type { AppPermission } from "@/types/permissions";
import { Building2, FolderKanban, LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react";

interface NavItemMeta {
  title: string;
  icon: LucideIcon;
  /** 显示该导航项所需的权限;省略则任何登录用户可见。 */
  permission?: AppPermission;
}

export type NavItem = { to: FileRouteTypes["to"] } & NavItemMeta;

export interface NavGroup {
  label: string;
  /** 可折叠组标题图标;单项组直接用子项图标,不需要组图标。 */
  icon?: LucideIcon;
  items: readonly NavItem[];
}

export const navGroups: readonly NavGroup[] = [
  {
    label: "概览",
    items: [{ to: "/dashboard", title: "概览", icon: LayoutDashboard }],
  },
  {
    label: "访问控制",
    icon: ShieldCheck,
    items: [
      { to: "/iam/roles", title: "角色", icon: ShieldCheck, permission: "roles.read" },
      { to: "/iam/organizations", title: "组织", icon: Building2, permission: "organizations.read" },
      { to: "/iam/users", title: "用户", icon: Users, permission: "users.read" },
    ],
  },
  {
    label: "项目",
    items: [{ to: "/projects", title: "项目", icon: FolderKanban, permission: "projects.read" }],
  },
  {
    label: "系统",
    items: [{ to: "/settings", title: "系统设置", icon: Settings, permission: "settings.read" }],
  },
];
