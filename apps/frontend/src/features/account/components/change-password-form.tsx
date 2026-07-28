import { useForm } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import Apis from "@/api";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { signOut } from "@/lib/auth-client";

// 自助修改密码:验当前密码 + 新密码 + 确认。成功后后端删全部 session,前端 signOut + 跳 /login。
const schema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z.string().min(8, "新密码至少 8 位"),
  confirmPassword: z.string().min(1, "请确认新密码"),
}).refine(v => v.newPassword === v.confirmPassword, {
  message: "两次输入的新密码不一致",
  path: ["confirmPassword"],
});

function FieldError({ errors }: { errors: readonly unknown[] }) {
  const error = errors[0];
  if (error === undefined) {
    return null;
  }
  const message = typeof error === "object" && error !== null && "message" in error
    ? String((error as Record<string, unknown>).message)
    : String(error);
  return <FieldDescription>{message}</FieldDescription>;
}

export function ChangePasswordForm() {
  const router = useRouter();

  const form = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      try {
        await Apis.Me.changeMyPassword({
          data: { currentPassword: value.currentPassword, newPassword: value.newPassword },
        });
        toast.success("密码已修改,请重新登录");
        // 后端已删全部 session;前端 signOut 清本地状态后跳 /login。
        await signOut();
        await router.navigate({ to: "/login" });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "修改失败");
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <FieldGroup className="max-w-sm">
        <form.Field name="currentPassword">
          {field => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor="current-password">当前密码</FieldLabel>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={field.state.value}
                onChange={e => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="newPassword">
          {field => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor="new-password">新密码</FieldLabel>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={field.state.value}
                onChange={e => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="confirmPassword">
          {field => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor="confirm-password">确认新密码</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={field.state.value}
                onChange={e => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </FieldGroup>
      <form.Subscribe selector={state => state.isSubmitting}>
        {isSubmitting => (
          <Button type="submit" disabled={isSubmitting} className="w-fit">
            {isSubmitting && <Spinner data-icon="inline-start" />}
            修改密码
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
