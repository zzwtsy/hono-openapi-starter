import type { FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useRegister } from "../hooks";

// 注册表单:Field 模式 + zod safeParse;关闭注册时 BA hooks 返回错误文案走 formError Alert。
const registerSchema = z.object({
  name: z.string().min(1, "请输入显示名"),
  email: z.email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少 8 位"),
});

export function RegisterForm() {
  const { register } = useRegister();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = registerSchema.safeParse({ name, email, password });
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
      await register(result.data);
      // 成功 -> navigate /login -> 组件卸载
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "注册失败");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={e => void onSubmit(e)} className="flex flex-col gap-4">
      {formError !== null && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>注册失败</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field data-invalid={fieldErrors.name !== undefined}>
          <FieldLabel htmlFor="name">显示名</FieldLabel>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            required
            placeholder="张三"
            value={name}
            onChange={e => setName(e.target.value)}
            aria-invalid={fieldErrors.name !== undefined}
          />
          {fieldErrors.name !== undefined && (
            <FieldDescription>{fieldErrors.name}</FieldDescription>
          )}
        </Field>
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
            autoComplete="new-password"
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
        注册
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        已有账号？
        {" "}
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          去登录
        </Link>
      </p>
    </form>
  );
}
