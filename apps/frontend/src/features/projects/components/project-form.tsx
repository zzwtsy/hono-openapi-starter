import type { Project } from "@/api/globals";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import Apis from "@/api";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

// 项目 create/edit 表单(TanStack Form + zod 直接校验,zod v4 是 standard schema 无需 adapter)。
// project 传入 = edit 预填,不传 = create。成功调 onSuccess(父组件关 Dialog + 刷新列表)。
const projectSchema = z.object({
  name: z.string().min(1, "请输入项目名"),
  description: z.string(),
});

interface ProjectFormProps {
  project?: Project;
  onSuccess: () => void;
}

export function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const form = useForm({
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
    },
    validators: {
      onChange: projectSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        if (project) {
          await Apis.Projects.updateProject({
            pathParams: { projectId: project.id },
            data: { name: value.name, description: value.description || null },
          });
          toast.success("项目已更新");
        } else {
          await Apis.Projects.createProject({
            data: { name: value.name, description: value.description || undefined },
          });
          toast.success("项目已创建");
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
        <DialogTitle>{project ? "编辑项目" : "新建项目"}</DialogTitle>
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
                <FieldLabel htmlFor="project-name">名称</FieldLabel>
                <Input
                  id="project-name"
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
                <FieldLabel htmlFor="project-description">描述</FieldLabel>
                <Input
                  id="project-description"
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
                {project ? "保存" : "创建"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </form>
    </>
  );
}
