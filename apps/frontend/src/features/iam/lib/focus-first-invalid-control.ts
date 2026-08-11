/** 聚焦当前表单内首个可访问的无效控件。 */
export function focusFirstInvalidControl(formElement: HTMLFormElement | null): void {
  const control = formElement?.querySelector<HTMLElement>("[aria-invalid=\"true\"]");
  control?.focus();
}
