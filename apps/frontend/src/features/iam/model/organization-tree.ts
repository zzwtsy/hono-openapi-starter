import type { Organization } from "@/api/globals";

export const ORGANIZATION_TREE_ROOT_ID = "__organization-tree-root__";

export interface OrganizationParentOption {
  label: string;
  value: string | null;
}

export interface OrganizationTreeIndex {
  byId: Map<string, Organization>;
  rootIds: string[];
  getAncestors: (id: string) => Organization[];
  getChildren: (id: string) => Organization[];
  getDescendantIds: (id: string) => Set<string>;
  getDisplayPath: (id: string) => string;
  getParent: (id: string) => Organization | undefined;
  getParentOptions: (editingId?: string) => OrganizationParentOption[];
}

export function buildOrganizationTree(organizations: Organization[]): OrganizationTreeIndex {
  const byId = new Map(organizations.map(organization => [organization.id, organization]));
  const parentById = new Map<string, string | null>();

  for (const organization of organizations) {
    const parentId = organization.parentId;
    parentById.set(
      organization.id,
      parentId !== null && parentId !== organization.id && byId.has(parentId) ? parentId : null,
    );
  }

  // Break malformed cycles deterministically so every organization remains reachable.
  const visitState = new Map<string, "visiting" | "visited">();
  const visitParent = (id: string) => {
    visitState.set(id, "visiting");
    const parentId = parentById.get(id);
    if (parentId !== null && parentId !== undefined) {
      const parentState = visitState.get(parentId);
      if (parentState === "visiting") {
        parentById.set(id, null);
      } else if (parentState !== "visited") {
        visitParent(parentId);
      }
    }
    visitState.set(id, "visited");
  };

  for (const organization of organizations) {
    if (visitState.get(organization.id) !== "visited") {
      visitParent(organization.id);
    }
  }

  const childrenByParentId = new Map<string | null, string[]>();
  for (const organization of organizations) {
    const parentId = parentById.get(organization.id) ?? null;
    const children = childrenByParentId.get(parentId) ?? [];
    children.push(organization.id);
    childrenByParentId.set(parentId, children);
  }

  const getChildren = (id: string) => (
    childrenByParentId.get(id)?.flatMap(childId => byId.get(childId) ?? []) ?? []
  );

  const getAncestors = (id: string) => {
    const ancestors: Organization[] = [];
    const visited = new Set<string>([id]);
    let parentId = parentById.get(id) ?? null;

    while (parentId !== null && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = byId.get(parentId);
      if (parent === undefined) {
        break;
      }
      ancestors.unshift(parent);
      parentId = parentById.get(parentId) ?? null;
    }

    return ancestors;
  };

  const getDescendantIds = (id: string) => {
    const descendants = new Set<string>();
    const pending = [...(childrenByParentId.get(id) ?? [])];
    while (pending.length > 0) {
      const childId = pending.pop();
      if (childId === undefined || descendants.has(childId) || childId === id) {
        continue;
      }
      descendants.add(childId);
      pending.push(...(childrenByParentId.get(childId) ?? []));
    }
    return descendants;
  };

  const getDisplayPath = (id: string) => {
    const organization = byId.get(id);
    if (organization === undefined) {
      return id;
    }
    return [...getAncestors(id), organization].map(item => item.name).join(" / ");
  };

  return {
    byId,
    rootIds: childrenByParentId.get(null) ?? [],
    getAncestors,
    getChildren,
    getDescendantIds,
    getDisplayPath,
    getParent: id => byId.get(parentById.get(id) ?? ""),
    getParentOptions: (editingId) => {
      const excluded = editingId === undefined
        ? new Set<string>()
        : new Set([editingId, ...getDescendantIds(editingId)]);
      return [
        { label: "无（根组织）", value: null },
        ...organizations.flatMap(organization => excluded.has(organization.id)
          ? []
          : [{ label: getDisplayPath(organization.id), value: organization.id }]),
      ];
    },
  };
}
