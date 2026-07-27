import type { UserSummary } from "@/api/globals";
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

// 用户 create/edit 表单(TanStack Form + zod)。user 传入 = edit(name/email);不传 = create(+password+orgId)。
// create 选归属组织(操作者管理子树内,由父组件算 orgOptions 传入);edit 不改 orgId(调岗见后端 iam.md)。
// schema 字段与 defaultValues 对齐(含 password/orgId),edit 时 password 不展示不提交、orgId 不展示不提交。
function buildSchema(isEdit: boolean) {
  return z.object({
    name: z.string().min(1, "请输入显示名"),
    email: z.email("请输入有效邮箱"),
    password: isEdit
      ? z.string()
      : z.string().min(8, "密码至少 8 位"),
    orgId: isEdit ? z.string() : z.string().min(1, "请选择归属组织"),
  });
}

export interface UserOrgOption {
  label: string;
  value: string;
}

interface UserFormProps {
  user?: UserSummary;
  onSuccess: () => void;
  /** create 模式可选归属组织(操作者管理子树内)。edit 模式忽略。 */
  orgOptions?: UserOrgOption[];
  /** create 模式默认归属组织(操作者 home)。 */
  defaultOrgId?: string;
}

export function UserForm({ user, onSuccess, orgOptions, defaultOrgId }: UserFormProps) {
  const isEdit = user !== undefined;

  const form = useForm({
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      orgId: isEdit ? (user?.orgId ?? "") : (defaultOrgId ?? ""),
    },
    validators: {
      onChange: buildSchema(isEdit),
    },
    onSubmit: async ({ value }) => {
      try {
        if (isEdit) {
          await Apis.IAM.updateUser({
            pathParams: { userId: user.id },
            data: { name: value.name, email: value.email },
          });
          toast.success("用户已更新");
        } else {
          await Apis.IAM.createUser({
            data: { name: value.name, email: value.email, password: value.password, orgId: value.orgId },
          });
          toast.success("用户已创建");
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
        <DialogTitle>{isEdit ? "编辑用户" : "新建用户"}</DialogTitle>
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
                <FieldLabel htmlFor="user-name">显示名</FieldLabel>
                <Input
                  id="user-name"
                  autoComplete="name"
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                {field.state.meta.errors.length > 0 && (
                  <FieldDescription>{String(field.state.meta.errors[0]?.message ?? field.state.meta.errors[0])}</FieldDescription>
                )}
              </Field>
            )}
          </form.Field>
          <form.Field name="email">
            {field => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="user-email">邮箱</FieldLabel>
                <Input
                  id="user-email"
                  type="email"
                  autoComplete="email"
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                {field.state.meta.errors.length > 0 && (
                  <FieldDescription>{String(field.state.meta.errors[0]?.message ?? field.state.meta.errors[0])}</FieldDescription>
                )}
              </Field>
            )}
          </form.Field>
          {!isEdit && (
            <>
              <form.Field name="password">
                {field => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="user-password">初始密码</FieldLabel>
                    <Input
                      id="user-password"
                      type="password"
                      autoComplete="new-password"
                      value={field.state.value}
                      onChange={e => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <FieldDescription>{String(field.state.meta.errors[0]?.message ?? field.state.meta.errors[0])}</FieldDescription>
                    )}
                  </Field>
                )}
              </form.Field>
              <form.Field name="orgId">
                {field => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="user-org">归属组织</FieldLabel>
                    <Select
                      items={orgOptions ?? []}
                      value={field.state.value}
                      onValueChange={(val) => { field.handleChange(val ?? ""); }}
                    >
                      <SelectTrigger id="user-org" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {(orgOptions ?? []).map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 && (
                      <FieldDescription>{String(field.state.meta.errors[0]?.message ?? field.state.meta.errors[0])}</FieldDescription>
                    )}
                  </Field>
                )}
              </form.Field>
            </>
          )}
        </FieldGroup>
        <DialogFooter>
          <form.Subscribe selector={state => state.isSubmitting}>
            {isSubmitting => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {isEdit ? "保存" : "创建"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </form>
    </>
  );
}
