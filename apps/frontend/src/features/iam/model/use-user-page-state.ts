import { useRequest } from "alova/client";
import { useMemo } from "react";
import Apis from "@/shared/api";
import { useCan } from "@/shared/lib/use-permissions";
import { buildOrganizationTree } from "./organization-tree";

interface OrgOption {
  label: string;
  value: string;
}

/**
 * 用户/角色管理页的派生状态:授权视角组织选项 + 组织路径显示。
 *
 * 从 routes 下放到 features/iam/model(route 保持薄,派生属业务)。
 */
export function useUserPageState(homeOrgId: string) {
  const canReadOrgs = useCan("organizations.read");
  const { data: organizations } = useRequest(() => Apis.IAM.listOrganizations(), { immediate: canReadOrgs });

  const orgOptions = useMemo<OrgOption[]>(() => {
    if (organizations == null) {
      return [{ label: homeOrgId, value: homeOrgId }];
    }
    const tree = buildOrganizationTree(organizations);
    return [
      { label: tree.getDisplayPath(homeOrgId), value: homeOrgId },
      ...[...tree.getDescendantIds(homeOrgId)].map(id => ({ label: tree.getDisplayPath(id), value: id })),
    ];
  }, [organizations, homeOrgId]);

  const getOrgPath = useMemo(() => {
    if (organizations == null) {
      return (id: string) => id;
    }
    const tree = buildOrganizationTree(organizations);
    return (id: string) => tree.getDisplayPath(id);
  }, [organizations]);

  return { orgOptions, getOrgPath };
}
