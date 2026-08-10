import type { ColumnPreferenceConfig, ColumnPreferenceState } from "@/lib/data-table/column-preferences";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  columnPreferenceStorageKey,
  createColumnVisibilityState,
  moveColumnPreference,
  normalizeColumnPreferences,
  readColumnPreferences,
  resolveUpdater,
  toggleColumnVisibility,
  writeColumnPreferences,
} from "@/lib/data-table/column-preferences";

interface UseColumnPreferencesOptions extends ColumnPreferenceConfig {
  tableId: string;
}

function getStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function useColumnPreferences({ tableId, columnIds, defaultOrder, hideableIds, fixedEndIds }: UseColumnPreferencesOptions) {
  const config = useMemo<ColumnPreferenceConfig>(() => ({ columnIds, defaultOrder, hideableIds, fixedEndIds }), [columnIds, defaultOrder, fixedEndIds, hideableIds]);
  const storageKey = useMemo(() => columnPreferenceStorageKey(tableId), [tableId]);
  const [rawPreferences, setRawPreferences] = useState<ColumnPreferenceState>(() => {
    return readColumnPreferences(getStorage(), storageKey, config);
  });
  const preferences = useMemo(() => normalizeColumnPreferences(rawPreferences, config), [config, rawPreferences]);

  useEffect(() => {
    writeColumnPreferences(getStorage(), storageKey, preferences);
  }, [preferences, storageKey]);

  const update = useCallback((updater: ColumnPreferenceState | ((current: ColumnPreferenceState) => ColumnPreferenceState)) => {
    setRawPreferences((current) => {
      const normalized = normalizeColumnPreferences(current, config);
      return normalizeColumnPreferences(resolveUpdater(updater, normalized), config);
    });
  }, [config]);

  const setOrder = useCallback((activeId: string, overId: string) => {
    setRawPreferences((current) => {
      const normalized = normalizeColumnPreferences(current, config);
      return moveColumnPreference(normalized, activeId, overId, config);
    });
  }, [config]);

  const setVisibility = useCallback((id: string, checked: boolean) => {
    setRawPreferences((current) => {
      const normalized = normalizeColumnPreferences(current, config);
      return toggleColumnVisibility(normalized, id, config, checked);
    });
  }, [config]);

  const reset = useCallback(() => {
    setRawPreferences(normalizeColumnPreferences(undefined, config));
  }, [config]);

  return {
    preferences,
    visibility: createColumnVisibilityState(preferences.hidden),
    update,
    setOrder,
    setVisibility,
    reset,
  };
}
