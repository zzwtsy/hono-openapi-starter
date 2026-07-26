import { OrganizationExplorer } from "@/features/iam/ui/organization-explorer";

interface OrganizationsPageProps {
  selectedOrganizationId?: string;
  onSelectedOrganizationChange: (id?: string) => void;
}

export function OrganizationsPage({ selectedOrganizationId, onSelectedOrganizationChange }: OrganizationsPageProps) {
  return (
    <OrganizationExplorer
      selectedOrganizationId={selectedOrganizationId}
      onSelectedOrganizationChange={onSelectedOrganizationChange}
    />
  );
}
