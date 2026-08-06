import type { AuditLog } from "@/api/globals";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 审计变更详情:结构化逐字段 diff(替代 JSON dump)。
 *
 * - 字段收集:changedFields 优先(后端算好的变更集,过滤 `_names` 展示辅助键);否则 before/after 键并集
 * - 变更标记:`<ins>` 新增(绿)/ `<del>` 删除(红)/ 值不同(蓝 + →)——颜色 + sr-only 前缀双通道,
 *   `<del>` 去默认删除线(低视力可读性);不靠颜色单独传达(WCAG 1.4.1)
 * - 值渲染:`_names` 关联名称优先于裸 id;对象/数组 JSON 截断 120 + 展开;长文本折叠
 * - 数组输入(before/after 为数组,如权限列表):单行摘要,不逐项 diff
 * - 「格式化 / 原始」切换兜底完整 JSON
 *
 * 调研依据:audit-frontend-polish-stage2.md(diff viewer a11y / GitHub audit payload 双视图)。
 */

interface AuditDiffListProps {
  before: AuditLog["beforeState"];
  after: AuditLog["afterState"];
  changedFields?: AuditLog["changedFields"];
}

/** 长值折叠阈值(字符),超出截断 + 展开按钮。 */
const COLLAPSE_THRESHOLD = 120;

type ChangeKind = "added" | "removed" | "changed";

interface DiffRow {
  field: string;
  kind: ChangeKind;
  before?: unknown;
  after?: unknown;
}

/** 键存在性判断:值为 null 也是"有值"(如 description: null = 无描述);只有键缺失才算无。 */
function hasKey(obj: Record<string, unknown> | null | undefined, key: string): boolean {
  return obj != null && key in obj;
}

/** 值比较(标量 ===;对象/数组 JSON 值级)。 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/** 收集 diff 行:数组输入返回单行摘要;对象输入按 changedFields/键并集逐字段判定。 */
function collectRows(
  before: AuditLog["beforeState"],
  after: AuditLog["afterState"],
  changedFields: string[] | null | undefined,
): DiffRow[] {
  if (Array.isArray(before) || Array.isArray(after)) {
    return collectArrayRows(before, after);
  }
  return collectObjectRows(before, after, changedFields);
}

/** 数组输入(权限列表等):单行摘要,不逐项 diff。 */
function collectArrayRows(before: unknown, after: unknown): DiffRow[] {
  const hasBefore = Array.isArray(before);
  const hasAfter = Array.isArray(after);
  if (!hasBefore) {
    return [{ field: "值", kind: "added", after }];
  }
  if (!hasAfter) {
    return [{ field: "值", kind: "removed", before }];
  }
  if (valuesEqual(before, after)) {
    return []; // 无变更
  }
  return [{ field: "值", kind: "changed", before, after }];
}

/** 对象输入:按 changedFields(过滤 `_names`)或键并集逐字段判定变更类型。 */
function collectObjectRows(
  before: AuditLog["beforeState"],
  after: AuditLog["afterState"],
  changedFields: string[] | null | undefined,
): DiffRow[] {
  const beforeObj = isRecord(before) ? before : undefined;
  const afterObj = isRecord(after) ? after : undefined;
  const fields = collectObjectFields(beforeObj, afterObj, changedFields);

  const rows: DiffRow[] = [];
  for (const field of fields) {
    const hasBefore = hasKey(beforeObj, field);
    const hasAfter = hasKey(afterObj, field);
    if (!hasBefore && !hasAfter) {
      continue; // 理论不可达(并集保证),防御
    }
    const beforeValue = beforeObj?.[field];
    const afterValue = afterObj?.[field];
    if (hasBefore && hasAfter && valuesEqual(beforeValue, afterValue)) {
      continue; // 非变更字段不进 diff
    }
    rows.push({
      field,
      kind: kindOf(hasBefore, hasAfter),
      before: hasBefore ? beforeValue : undefined,
      after: hasAfter ? afterValue : undefined,
    });
  }
  return rows;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** 字段收集:changedFields 优先(过滤 `_names` 展示辅助键),否则 before/after 键并集。 */
function collectObjectFields(
  beforeObj: Record<string, unknown> | null | undefined,
  afterObj: Record<string, unknown> | null | undefined,
  changedFields: string[] | null | undefined,
): string[] {
  if (changedFields != null && changedFields.length > 0) {
    return changedFields.filter(f => f !== "_names");
  }
  return [...new Set([...Object.keys(beforeObj ?? {}), ...Object.keys(afterObj ?? {})])].filter(f => f !== "_names");
}

/** 变更类型:仅 after 有 -> 新增;仅 before 有 -> 删除;都有 -> 变更。 */
function kindOf(hasBefore: boolean, hasAfter: boolean): ChangeKind {
  if (!hasBefore) {
    return "added";
  }
  if (!hasAfter) {
    return "removed";
  }
  return "changed";
}

/** 从快照取 `_names` 关联名称表(键 -> 中文名称)。 */
function namesOf(snapshot: unknown): Record<string, string> | undefined {
  if (!isRecord(snapshot) || !isRecord(snapshot._names)) {
    return undefined;
  }
  const names: Record<string, string> = {};
  for (const [key, value] of Object.entries(snapshot._names)) {
    if (typeof value === "string") {
      names[key] = value;
    }
  }
  return names;
}

/** 值渲染:_names 名称优先;对象/数组 JSON;标量 String;null -> "—"。 */
function formatValue(field: string, value: unknown, names?: Record<string, string>): string {
  if (value == null) {
    return "—";
  }
  if (typeof value === "string") {
    return names?.[field] ?? value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value) ?? String(value);
}

/** 长值折叠:超过阈值截断 + 展开按钮。 */
function CollapsibleValue({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= COLLAPSE_THRESHOLD) {
    return <span>{text}</span>;
  }
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className="break-all">{expanded ? text : `${text.slice(0, COLLAPSE_THRESHOLD)}…`}</span>
      <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={() => setExpanded(e => !e)}>
        {expanded ? "收起" : "展开"}
      </Button>
    </span>
  );
}

const kindStyles: Record<ChangeKind, { wrapper: string; value: string; prefix: string }> = {
  added: {
    wrapper: "text-emerald-700 dark:text-emerald-400",
    value: "bg-emerald-500/10 rounded-sm px-1",
    prefix: "新增：",
  },
  removed: {
    wrapper: "text-red-700 dark:text-red-400",
    value: "bg-red-500/10 rounded-sm px-1",
    prefix: "移除：",
  },
  changed: {
    wrapper: "text-blue-700 dark:text-blue-400",
    value: "",
    prefix: "变更：",
  },
};

export function AuditDiffList({ before, after, changedFields }: AuditDiffListProps) {
  const [showRaw, setShowRaw] = useState(false);
  const rows = collectRows(before, after, changedFields);

  if (showRaw) {
    return (
      <div className="flex flex-col gap-2">
        <Button type="button" variant="ghost" size="sm" className="h-auto self-start p-0 text-xs" onClick={() => setShowRaw(false)}>
          返回格式化视图
        </Button>
        <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
          {JSON.stringify({ before, after }, null, 2)}
        </pre>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">无变更数据。</p>
        {before != null || after != null
          ? (
              <Button type="button" variant="ghost" size="sm" className="h-auto self-start p-0 text-xs" onClick={() => setShowRaw(true)}>
                查看原始数据
              </Button>
            )
          : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col gap-1.5">
        {rows.map(row => (
          <DiffRowView key={row.field} row={row} before={before} after={after} />
        ))}
      </dl>
      <Button type="button" variant="ghost" size="sm" className="h-auto self-start p-0 text-xs" onClick={() => setShowRaw(true)}>
        查看原始数据
      </Button>
    </div>
  );
}

function DiffRowView({ row, before, after }: { row: DiffRow; before: AuditLog["beforeState"]; after: AuditLog["afterState"] }) {
  const style = kindStyles[row.kind];
  const beforeNames = namesOf(before);
  const afterNames = namesOf(after);
  const beforeText = row.before !== undefined ? formatValue(row.field, row.before, beforeNames) : undefined;
  const afterText = row.after !== undefined ? formatValue(row.field, row.after, afterNames) : undefined;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm", style.wrapper)}>
      <dt className="w-28 shrink-0 truncate font-medium text-foreground">{row.field}</dt>
      <dd className="contents">
        <span className="sr-only">{style.prefix}</span>
        <DiffValues kind={row.kind} beforeText={beforeText} afterText={afterText} valueClass={style.value} />
      </dd>
    </div>
  );
}

/** 按变更类型渲染值:removed 只显旧值(del)、added 只显新值(ins)、changed 双值 + 箭头。 */
function DiffValues({ kind, beforeText, afterText, valueClass }: {
  kind: ChangeKind;
  beforeText: string | undefined;
  afterText: string | undefined;
  valueClass: string;
}) {
  if (kind === "removed") {
    return (
      <del className="decoration-none">
        <span className={valueClass}><CollapsibleValue text={beforeText ?? ""} /></span>
      </del>
    );
  }
  if (kind === "added") {
    return (
      <ins className="decoration-none">
        <span className={valueClass}><CollapsibleValue text={afterText ?? ""} /></span>
      </ins>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span><CollapsibleValue text={beforeText ?? ""} /></span>
      <span aria-hidden="true">→</span>
      <span className={valueClass}><CollapsibleValue text={afterText ?? ""} /></span>
    </span>
  );
}
