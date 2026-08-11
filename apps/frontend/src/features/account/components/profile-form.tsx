import { useForm } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import Apis from "@/api";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

// 自助修改显示名。改成功后 router.invalidate() 重跑 beforeLoad(失效 Me.getMe 缓存后重拉),
// sidebar 等依赖 context.auth.user.name 的组件自动刷新。
const schema = z.object({
  name: z.string().min(1, "请输入显示名"),
});

interface ProfileFormProps {
  currentName: string;
}

export function ProfileForm({ currentName }: ProfileFormProps) {
  const router = useRouter();

  const form = useForm({
    defaultValues: { name: currentName },
    validators: { onBlur: schema, onSubmit: schema },
    onSubmit: async ({ value }) => {
      try {
        await Apis.Me.updateMe({ data: { name: value.name } });
        toast.success("显示名已更新");
        // 失效 Me.getMe 缓存(hitSource)+ 重跑 beforeLoad 更新 context.auth.user
        await router.invalidate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "更新失败");
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
      <FieldGroup className="max-w-sm">
        <form.Field name="name">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="profile-name">显示名</FieldLabel>
                <Input
                  id="profile-name"
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
      </FieldGroup>
      <form.Subscribe selector={state => state.isSubmitting}>
        {isSubmitting => (
          <Button type="submit" disabled={isSubmitting} className="w-fit">
            {isSubmitting && <Spinner data-icon="inline-start" />}
            保存
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
