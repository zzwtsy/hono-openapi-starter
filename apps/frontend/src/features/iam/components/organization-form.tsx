import type { Organization } from "@/api/globals";
import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import Apis from "@/api";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { focusFirstInvalidControl } from "../lib/focus-first-invalid-control";
import { buildOrganizationTree } from "../lib/organization-tree";

const organizationSchema = z.object({
  name: z.string().min(1, "请输入组织名"),
  parentId: z.string(),
});

type OrganizationFormValues = z.infer<typeof organizationSchema>;

interface OrganizationFormProps {
  organizations: Organization[];
  organization?: Organization;
  defaultParentId?: string;
  onSuccess: (organization: Organization) => void | Promise<void>;
}

interface ReparentConfirmDialogProps {
  open: boolean;
  busy: boolean;
  parentLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

interface OrganizationReparentDialogProps extends Omit<ReparentConfirmDialogProps, "onConfirm"> {
  values?: OrganizationFormValues;
  save: (values: OrganizationFormValues) => Promise<boolean>;
  onConfirmed: () => void;
  onBusyChange: (busy: boolean) => void;
}

async function persistOrganization(
  organization: Organization | undefined,
  onSuccess: OrganizationFormProps["onSuccess"],
  value: OrganizationFormValues,
): Promise<boolean> {
  try {
    const keepsCurrentParent = organization !== undefined && value.parentId === "";
    if (organization === undefined && value.parentId === "") {
      toast.error("请选择父组织");
      return false;
    }
    const savedOrganization = organization
      ? await Apis.IAM.updateOrganization({
          pathParams: { orgId: organization.id },
          data: keepsCurrentParent ? { name: value.name } : { name: value.name, parentId: value.parentId },
        })
      : await Apis.IAM.createOrganization({ data: { name: value.name, parentId: value.parentId } });
    toast.success(organization ? "组织已更新" : "组织已创建");
    await onSuccess(savedOrganization);
    return true;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "操作失败");
    return false;
  }
}

function ReparentConfirmDialog({
  open,
  busy,
  parentLabel,
  onConfirm,
  onClose,
}: ReparentConfirmDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={open}
      busy={busy}
      title="确认变更父组织"
      description={`变更父组织会改变该组织及其用户的继承权限路径。确认移动到“${parentLabel}”吗？`}
      confirmLabel="确认变更"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}

function OrganizationReparentDialog({
  values,
  save,
  onConfirmed,
  onBusyChange,
  ...dialogProps
}: OrganizationReparentDialogProps) {
  return (
    <ReparentConfirmDialog
      {...dialogProps}
      onConfirm={() => {
        if (values == null) {
          return;
        }
        onBusyChange(true);
        void save(values).then((ok) => {
          onBusyChange(false);
          if (ok) {
            onConfirmed();
          }
        });
      }}
    />
  );
}

export function OrganizationForm({
  organizations,
  organization,
  defaultParentId,
  onSuccess,
}: OrganizationFormProps) {
  const organizationTree = buildOrganizationTree(organizations);
  const [pendingValues, setPendingValues] = useState<OrganizationFormValues>();
  const [reparentConfirming, setReparentConfirming] = useState(false);
  const [reparentBusy, setReparentBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isTopologyLocked = organization !== undefined
    && (organization.parentId == null || !organizations.some(item => item.id === organization.parentId));
  const saveOrganization = (value: OrganizationFormValues) =>
    persistOrganization(organization, onSuccess, value);

  const form = useForm({
    defaultValues: {
      name: organization?.name ?? "",
      parentId: isTopologyLocked ? "" : (organization?.parentId ?? defaultParentId ?? ""),
    },
    validators: {
      onBlur: organizationSchema,
      onSubmit: organizationSchema,
    },
    onSubmitInvalid: () => window.requestAnimationFrame(() => focusFirstInvalidControl(formRef.current)),
    onSubmit: async ({ value }) => {
      const nextParentId = value.parentId === "" ? null : value.parentId;
      const currentParentId = organization?.parentId ?? null;
      if (organization && !isTopologyLocked && nextParentId !== currentParentId) {
        setPendingValues(value);
        setReparentConfirming(true);
        return;
      }
      await saveOrganization(value);
    },
  });

  const parentItems = organizationTree.getParentOptions(organization?.id).filter(item => item.value != null);
  let pendingParentLabel = "管理范围根";
  if (pendingValues?.parentId != null && pendingValues.parentId !== "") {
    pendingParentLabel = organizationTree.getDisplayPath(pendingValues.parentId);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{organization ? "编辑组织" : "新建组织"}</DialogTitle>
      </DialogHeader>
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <form.Subscribe selector={state => state.submissionAttempts}>
          {submissionAttempts => (
            <FieldGroup>
              <form.Field name="name">
                {(field) => {
                  const isInvalid = (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="org-name">名称</FieldLabel>
                      <Input
                        id="org-name"
                        name={field.name}
                        autoComplete="off"
                        required
                        value={field.state.value}
                        onChange={e => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.Field>
              {!isTopologyLocked && (
                <form.Field name="parentId">
                  {field => (
                    <Field>
                      <FieldLabel htmlFor="org-parent">父组织</FieldLabel>
                      <Select
                        items={parentItems}
                        name={field.name}
                        value={field.state.value === "" ? null : field.state.value}
                        onValueChange={(val) => { field.handleChange(val ?? ""); }}
                      >
                        <SelectTrigger id="org-parent" className="w-full" onBlur={field.handleBlur}>
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
              )}
            </FieldGroup>
          )}
        </form.Subscribe>
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
      <OrganizationReparentDialog
        open={reparentConfirming}
        busy={reparentBusy}
        parentLabel={pendingParentLabel}
        values={pendingValues}
        save={saveOrganization}
        onBusyChange={setReparentBusy}
        onConfirmed={() => {
          setPendingValues(undefined);
          setReparentConfirming(false);
        }}
        onClose={() => {
          setPendingValues(undefined);
          setReparentConfirming(false);
        }}
      />
    </>
  );
}
