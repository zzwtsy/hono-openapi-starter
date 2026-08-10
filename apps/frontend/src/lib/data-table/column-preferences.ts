import { arrayMove } from "@dnd-kit/sortable";

export interface ColumnPreferenceState {
  order: string[];
  hidden: string[];
}

export interface ColumnPreferenceConfig {
  columnIds: readonly string[];
  defaultOrder: readonly string[];
  hideableIds: readonly string[];
  fixedEndIds?: readonly string[];
}

export function resolveUpdater<T>(updater: T | ((current: T) => T), current: T): T {
  return typeof updater === "function" ? (updater as (current: T) => T)(current) : updater;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function knownIds(values: readonly string[], columnIds: Set<string>): string[] {
  return unique(values).filter(id => columnIds.has(id));
}

export function normalizeColumnPreferences(
  value: Partial<ColumnPreferenceState> | null | undefined,
  config: ColumnPreferenceConfig,
): ColumnPreferenceState {
  const columnIds = new Set(config.columnIds);
  const fixedEndIds = new Set(knownIds(config.fixedEndIds ?? [], columnIds));
  const defaultOrder = knownIds(config.defaultOrder, columnIds);
  const persistedOrder = knownIds(value?.order ?? [], columnIds);
  const order = unique([...persistedOrder, ...defaultOrder, ...config.columnIds]).filter(id => !fixedEndIds.has(id));
  const fixedEnd = [...fixedEndIds].filter(id => columnIds.has(id));
  const normalizedOrder = [...order, ...fixedEnd];

  const hideableIds = new Set(knownIds(config.hideableIds, columnIds));
  let hidden = knownIds(value?.hidden ?? [], hideableIds);

  // 至少保留一个可配置字段，避免用户把表格隐藏成只有操作列的空壳。
  const visibleHideable = [...hideableIds].filter(id => !hidden.includes(id));
  if (hideableIds.size > 0 && visibleHideable.length === 0) {
    const fallback = normalizedOrder.find(id => hideableIds.has(id));
    hidden = fallback === undefined ? [] : hidden.filter(id => id !== fallback);
  }

  return { order: normalizedOrder, hidden };
}

export function readColumnPreferences(
  storage: Storage | undefined,
  key: string,
  config: ColumnPreferenceConfig,
): ColumnPreferenceState {
  if (storage === undefined) {
    return normalizeColumnPreferences(undefined, config);
  }

  try {
    const raw = storage.getItem(key);
    if (raw === null) {
      return normalizeColumnPreferences(undefined, config);
    }
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return normalizeColumnPreferences(undefined, config);
    }
    const candidate = parsed as { order?: unknown; hidden?: unknown };
    return normalizeColumnPreferences(
      {
        order: Array.isArray(candidate.order) ? candidate.order.filter((id): id is string => typeof id === "string") : [],
        hidden: Array.isArray(candidate.hidden) ? candidate.hidden.filter((id): id is string => typeof id === "string") : [],
      },
      config,
    );
  } catch {
    return normalizeColumnPreferences(undefined, config);
  }
}

export function writeColumnPreferences(storage: Storage | undefined, key: string, value: ColumnPreferenceState): void {
  if (storage === undefined) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify({ order: value.order, hidden: value.hidden }));
  } catch {
    // localStorage 可能被禁用或配额耗尽，表格交互仍应继续工作。
  }
}

export function createColumnVisibilityState(hidden: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(hidden.map(id => [id, false]));
}

export function toggleColumnVisibility(
  state: ColumnPreferenceState,
  id: string,
  config: ColumnPreferenceConfig,
  checked: boolean,
): ColumnPreferenceState {
  const hideable = new Set(config.hideableIds);
  if (!hideable.has(id)) {
    return state;
  }

  if (checked) {
    return { ...state, hidden: state.hidden.filter(hiddenId => hiddenId !== id) };
  }

  const visibleCount = [...hideable].filter(hideableId => !state.hidden.includes(hideableId)).length;
  if (visibleCount <= 1) {
    return state;
  }

  return { ...state, hidden: unique([...state.hidden, id]) };
}

export function moveColumnPreference(
  state: ColumnPreferenceState,
  activeId: string,
  overId: string,
  config: ColumnPreferenceConfig,
): ColumnPreferenceState {
  const from = state.order.indexOf(activeId);
  const to = state.order.indexOf(overId);
  if (from < 0 || to < 0 || activeId === overId) {
    return state;
  }

  const moved = arrayMove(state.order, from, to);
  return normalizeColumnPreferences({ ...state, order: moved }, config);
}

export function columnPreferenceStorageKey(tableId: string): string {
  return `hono-openapi-starter:data-table:${tableId}:v1`;
}
