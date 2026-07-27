import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * ISO 字符串格式化为中文日期(yyyy/mm/dd)。
 * 三个 List 组件(RoleList/UserList/ProjectList)共用,提取避免重复。
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN");
}
