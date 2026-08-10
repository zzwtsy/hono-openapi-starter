import { columnOrderingFeature, columnVisibilityFeature, createPaginatedRowModel, createTableHook, metaHelper, rowPaginationFeature, tableFeatures } from "@tanstack/react-table";

export interface DataTableColumnMeta {
  /** 用于列设置与无障碍文案的稳定显示名称。 */
  label: string;
  /** false 表示列不参与用户配置，通常用于操作列。 */
  configurable?: boolean;
  headerClassName?: string;
  cellClassName?: string;
}

/**
 * 项目级共享 feature 集合。
 *
 * 业务表只负责声明 columns/data/state，避免每张表重复注册相同 feature。
 */
export const dataTableFeatures = tableFeatures({
  columnMeta: metaHelper<DataTableColumnMeta>(),
  columnOrderingFeature,
  columnVisibilityFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowPaginationFeature,
});

export const { createAppColumnHelper, useAppTable } = createTableHook({
  features: dataTableFeatures,
});
