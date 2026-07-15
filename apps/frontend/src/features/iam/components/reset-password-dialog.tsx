import type { UserSummary } from "@/api/globals";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import Apis from "@/api";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const resetSchema = z.object({
  newPassword: z.string().min(8, "密码至少 8 位"),
});

interface ResetPasswordDialogProps {
  user: UserSummary;
  onSuccess: () => void;
}

/** 重置密码对话框:单字段 newPassword;成功后清 session(后端) + toast。 */
export function ResetPasswordDialog({ user, onSuccess }: ResetPasswordDialogProps) {
  const form = useForm({
    defaultValues: { newPassword: "" },
    validators: { onChange: resetSchema },
    onSubmit: async ({ value }) => {
      try {
        await Apis.IAM.resetUserPassword({
          pathParams: { userId: user.id },
          data: { newPassword: value.newPassword },
        });
        toast.success("密码已重置");
        onSuccess();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "重置失败");
      }
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>重置密码</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        为
        {" "}
        <span className="font-medium text-foreground">{user.name}</span>
        {" "}
        (
        {user.email}
        ) 设置新密码。对方需用新密码重新登录。
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <FieldGroup>
          <form.Field name="newPassword">
            {field => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="reset-password">新密码</FieldLabel>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
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
        </FieldGroup>
        <DialogFooter>
          <form.Subscribe selector={state => state.isSubmitting}>
            {isSubmitting => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                重置
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </form>
    </>
  );
}
