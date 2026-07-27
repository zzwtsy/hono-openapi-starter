import type { Role } from "@/api/globals";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import Apis from "@/api";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

// 角色 create/edit 表单(TanStack Form + zod 直接校验,zod v4 是 standard schema 无需 adapter)。
// role 传入=edit 预填,不传=create。成功调 onSuccess(父组件关 Dialog + 刷新列表)。
const roleSchema = z.object({
  name: z.string().min(1, "请输入角色名"),
  description: z.string(),
});

interface RoleFormProps {
  role?: Role;
  onSuccess: () => void;
}

export function RoleForm({ role, onSuccess }: RoleFormProps) {
  const form = useForm({
    defaultValues: {
      name: role?.name ?? "",
      description: role?.description ?? "",
    },
    validators: {
      onChange: roleSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        if (role) {
          await Apis.IAM.updateRole({
            pathParams: { roleId: role.id },
            data: { name: value.name, description: value.description || null },
          });
          toast.success("角色已更新");
        } else {
          await Apis.IAM.createRole({
            data: { name: value.name, description: value.description || undefined },
          });
          toast.success("角色已创建");
        }
        onSuccess();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "操作失败");
      }
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{role ? "编辑角色" : "新建角色"}</DialogTitle>
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
                <FieldLabel htmlFor="role-name">名称</FieldLabel>
                <Input
                  id="role-name"
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
          <form.Field name="description">
            {field => (
              <Field>
                <FieldLabel htmlFor="role-description">描述</FieldLabel>
                <Input
                  id="role-description"
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>
        <DialogFooter>
          <form.Subscribe selector={state => state.isSubmitting}>
            {isSubmitting => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {role ? "保存" : "创建"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </form>
    </>
  );
}
