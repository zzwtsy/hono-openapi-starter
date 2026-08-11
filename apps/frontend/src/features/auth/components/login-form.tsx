import { useForm } from "@tanstack/react-form";
import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useLogin } from "../hooks/use-login";

// 登录表单:TanStack Form + zod 管字段/校验/提交状态;认证失败保留为表单级 Alert。
const loginSchema = z.object({
  email: z.email("请输入有效邮箱"),
  password: z.string().min(1, "请输入密码"),
});

interface LoginFormProps {
  /** 登录成功后回跳目标(由 /login route 从 search.redirect 传入,safeRedirect 兜底)。 */
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const { login } = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onBlur: loginSchema, onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      try {
        await login(value.email, value.password, redirectTo);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "登录失败");
      }
    },
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      {formError !== null && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>登录失败</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <form.Field name="email">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="email">邮箱</FieldLabel>
                <Input
                  id="email"
                  name={field.name}
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
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
        <form.Field name="password">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="password">密码</FieldLabel>
                <Input
                  id="password"
                  name={field.name}
                  type="password"
                  autoComplete="current-password"
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
      </FieldGroup>
      <form.Subscribe selector={state => state.isSubmitting}>
        {isSubmitting => (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            登录
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
