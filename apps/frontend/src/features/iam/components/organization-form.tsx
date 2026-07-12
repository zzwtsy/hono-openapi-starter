import type { Organization } from "@/api/globals";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import Apis from "@/api";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { buildOrganizationTree } from "../organization-tree";

const organizationSchema = z.object({
  name: z.string().min(1, "请输入组织名"),
  parentId: z.string(),
});

interface OrganizationFormProps {
  organizations: Organization[];
  organization?: Organization;
  defaultParentId?: string;
  onSuccess: (organization: Organization) => void | Promise<void>;
}

export function OrganizationForm({
  organizations,
  organization,
  defaultParentId,
  onSuccess,
}: OrganizationFormProps) {
  const form = useForm({
    defaultValues: {
      name: organization?.name ?? "",
      parentId: organization?.parentId ?? defaultParentId ?? "",
    },
    validators: {
      onChange: organizationSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const parentId = value.parentId === "" ? undefined : value.parentId;
        let savedOrganization: Organization;
        if (organization) {
          savedOrganization = await Apis.IAM.updateOrganization({
            pathParams: { orgId: organization.id },
            data: { name: value.name, parentId: parentId ?? null },
          });
          toast.success("组织已更新");
        } else {
          savedOrganization = await Apis.IAM.createOrganization({
            data: { name: value.name, parentId },
          });
          toast.success("组织已创建");
        }
        await onSuccess(savedOrganization);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "操作失败");
      }
    },
  });

  const parentItems = buildOrganizationTree(organizations).getParentOptions(organization?.id);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{organization ? "编辑组织" : "新建组织"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <FieldGroup>
          <form.Field name="name">
            {field => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="org-name">名称</FieldLabel>
                <Input
                  id="org-name"
                  name="name"
                  autoComplete="off"
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                {field.state.meta.errors.length > 0 && (
                  <FieldDescription>{field.state.meta.errors[0]?.message}</FieldDescription>
                )}
              </Field>
            )}
          </form.Field>
          <form.Field name="parentId">
            {field => (
              <Field>
                <FieldLabel htmlFor="org-parent">父组织</FieldLabel>
                <Select
                  items={parentItems}
                  value={field.state.value === "" ? null : field.state.value}
                  onValueChange={(val) => { field.handleChange(val ?? ""); }}
                >
                  <SelectTrigger id="org-parent" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {parentItems.map(item => (
                        <SelectItem key={item.value ?? "root"} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>
        </FieldGroup>
        <DialogFooter>
          <form.Subscribe selector={state => state.isSubmitting}>
            {isSubmitting => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {organization ? "保存" : "创建"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </form>
    </>
  );
}
