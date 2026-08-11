---
status: Active
owner: frontend
lastReviewedAt: 2026-08-10
---

# 前端表单规范（TanStack Form）

## 核心边界

- 表单状态、字段校验和提交状态统一使用 `@tanstack/react-form`。
- 客户端校验使用 feature 内的 Zod schema；Zod 4 实现 Standard Schema，可直接传给 TanStack Form，不加 adapter。
- 业务 mutation 在 `onSubmit` 中直接 `await` wormhole 生成的 `Apis.*`。alova 继续负责请求、envelope 剥离和 `hitSource` 缓存失效，不再管理同一份表单状态。
- 前端 schema 只提供即时 UX 校验；后端 OpenAPI/Zod 仍是业务约束和安全校验的权威，不跨层 import 后端 schema。

## 默认实现

使用原生 `useForm` + shadcn `Field`，不创建项目级 `useAppForm`、字段 DSL 或预绑定组件：

```tsx
const form = useForm({
  defaultValues: { name: "" },
  validators: {
    onBlur: formSchema,
    onSubmit: formSchema,
  },
  onSubmit: async ({ value }) => {
    await Apis.Example.createExample({ data: value });
  },
});
```

默认校验策略是“失焦反馈 + 提交兜底”：

- 输入期间不主动展示新错误；字段失焦后展示该字段错误。
- 提交时校验全部字段，无效时不执行 `onSubmit`。
- `<form noValidate>` 关闭浏览器原生提示气泡，让 Zod 中文错误成为唯一客户端提示；控件仍保留 `name`、`type`、`autoComplete`、`required`、`minLength` 等语义属性。

## 字段与错误

表单布局使用 `FieldGroup` + `Field`。错误只用 shadcn `FieldError`，`FieldDescription` 只放帮助文字：

```tsx
<form.Field name="name">
  {(field) => {
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
    return (
      <Field data-invalid={isInvalid}>
        <FieldLabel htmlFor="example-name">名称</FieldLabel>
        <Input
          id="example-name"
          name={field.name}
          value={field.state.value}
          onChange={event => field.handleChange(event.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={isInvalid}
        />
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </Field>
    );
  }}
</form.Field>
```

非原生控件遵循相同语义：

- `Select` 接收 `name`、`value`、`onValueChange`；`SelectTrigger` 接收 `onBlur` 和 `aria-invalid`。
- Checkbox/Radio/Switch 的 `aria-invalid` 放在实际交互控件上。
- 必填组合字段用 `FieldSet` + `FieldLegend`，不用无语义容器模拟分组。

## 提交与错误反馈

- 提交按钮只订阅 `state.isSubmitting`，请求期间 `disabled` 并组合 `Spinner`，防止重复提交。
- mutation 成功后的 toast、Dialog 关闭、router invalidate 和缓存失效由 feature 保持现有业务语义。
- 字段错误只表达可定位的客户端校验问题；认证失败、冲突和服务端业务错误使用表单级 `Alert` 或 toast，不伪装成字段错误。
- alova 的同名 `useForm` 仅在确需草稿持久化、多步骤跨组件共享或自动恢复时单独评估；普通短表单不叠加两套状态源。

## 测试要求

新增或修改表单至少覆盖与变更相关的高价值行为：

- 失焦前不显示错误，失焦或提交后通过 `role="alert"` 展示错误。
- `data-invalid`、`aria-invalid`、label/control 关联和语义属性正确。
- 无效提交不发请求；有效提交 payload 转换正确。
- 异步提交期间按钮禁用；失败后恢复并展示表单级反馈。
- create/edit、条件字段或跨字段校验存在时，分别覆盖其关键分支。

测试使用 Vitest + Testing Library；业务 API 交互优先用现有 MSW 拦截真实 alova 请求链路。
