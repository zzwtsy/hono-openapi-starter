import { OrganizationExplorer } from "./components/organization-explorer";

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
