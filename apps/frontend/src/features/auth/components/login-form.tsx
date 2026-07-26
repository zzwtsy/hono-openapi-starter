import type { FormEvent } from "react";
import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useLogin } from "../hooks";

// 登录表单:Field 模式 + a11y(label/autocomplete/aria-invalid)+ zod safeParse(不引表单库)+
// Spinner loading 防重复提交。表单级错误(signIn 失败)用 Alert,per-field 错误用 FieldDescription。
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString();
        if (key !== undefined && errors[key] === undefined) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setLoading(true);
    try {
      await login(email, password, redirectTo);
      // 成功 -> login navigate -> 组件卸载,无需 setLoading(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "登录失败");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={e => void onSubmit(e)} className="flex flex-col gap-4">
      {formError !== null && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>登录失败</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field data-invalid={fieldErrors.email !== undefined}>
          <FieldLabel htmlFor="email">邮箱</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            aria-invalid={fieldErrors.email !== undefined}
          />
          {fieldErrors.email !== undefined && (
            <FieldDescription>{fieldErrors.email}</FieldDescription>
          )}
        </Field>
        <Field data-invalid={fieldErrors.password !== undefined}>
          <FieldLabel htmlFor="password">密码</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            aria-invalid={fieldErrors.password !== undefined}
          />
          {fieldErrors.password !== undefined && (
            <FieldDescription>{fieldErrors.password}</FieldDescription>
          )}
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={loading}>
        {loading && <Spinner data-icon="inline-start" />}
        登录
      </Button>
    </form>
  );
}
