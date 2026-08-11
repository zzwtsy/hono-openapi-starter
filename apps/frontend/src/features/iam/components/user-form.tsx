import type { UserSummary } from "@/api/globals";
import { useForm } from "@tanstack/react-form";
import { useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";
import Apis from "@/api";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { focusFirstInvalidControl } from "../lib/focus-first-invalid-control";

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

interface UserFormValues {
  name: string;
  email: string;
  password: string;
  orgId: string;
}

function getDefaultValues(user: UserSummary | undefined, defaultOrgId: string | undefined): UserFormValues {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    orgId: user ? (user.orgId ?? "") : (defaultOrgId ?? ""),
  };
}

async function saveUser(user: UserSummary | undefined, value: UserFormValues, onSuccess: () => void) {
  try {
    if (user) {
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
}

function UserFormHeader({ isEdit }: { isEdit: boolean }) {
  return (
    <DialogHeader>
      <DialogTitle>{isEdit ? "编辑用户" : "新建用户"}</DialogTitle>
    </DialogHeader>
  );
}

export function UserForm({ user, onSuccess, orgOptions, defaultOrgId }: UserFormProps) {
  const isEdit = user !== undefined;
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm({
    defaultValues: getDefaultValues(user, defaultOrgId),
    validators: { onBlur: buildSchema(isEdit), onSubmit: buildSchema(isEdit) },
    onSubmitInvalid: () => window.requestAnimationFrame(() => focusFirstInvalidControl(formRef.current)),
    onSubmit: ({ value }) => saveUser(user, value, onSuccess),
  });

  return (
    <>
      <UserFormHeader isEdit={isEdit} />
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
                      <FieldLabel htmlFor="user-name">显示名</FieldLabel>
                      <Input
                        id="user-name"
                        name={field.name}
                        autoComplete="name"
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
              <form.Field name="email">
                {(field) => {
                  const isInvalid = (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="user-email">邮箱</FieldLabel>
                      <Input
                        id="user-email"
                        name={field.name}
                        type="email"
                        autoComplete="email"
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
              {!isEdit && (
                <>
                  <form.Field name="password">
                    {(field) => {
                      const isInvalid = (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor="user-password">初始密码</FieldLabel>
                          <Input
                            id="user-password"
                            name={field.name}
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
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
                  <form.Field name="orgId">
                    {(field) => {
                      const isInvalid = (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor="user-org">归属组织</FieldLabel>
                          <Select
                            items={orgOptions ?? []}
                            name={field.name}
                            required
                            value={field.state.value}
                            onValueChange={(val) => { field.handleChange(val ?? ""); }}
                          >
                            <SelectTrigger
                              id="user-org"
                              className="w-full"
                              onBlur={field.handleBlur}
                              aria-invalid={isInvalid}
                            >
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
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      );
                    }}
                  </form.Field>
                </>
              )}
            </FieldGroup>
          )}
        </form.Subscribe>
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
