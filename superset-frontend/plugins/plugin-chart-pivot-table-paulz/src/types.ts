import {
  QueryFormData,
  DataRecord,
  SetDataMaskHook,
  DataRecordValue,
  JsonObject,
  TimeFormatter,
  NumberFormatter,
  QueryFormMetric,
  QueryFormColumn,
  TimeGranularity,
  ContextMenuFilters,
  Currency,
  HandlerFunction,
} from '@superset-ui/core';
import { ColorFormatters } from '@superset-ui/chart-controls';
import { DND_ACCEPT_TYPE, CONTAINER_TYPES } from './constants';

export type DndAcceptType =
  (typeof DND_ACCEPT_TYPE)[keyof typeof DND_ACCEPT_TYPE];

export type ContainerType =
  (typeof CONTAINER_TYPES)[keyof typeof CONTAINER_TYPES];

export type ItemType = QueryFormColumn | QueryFormMetric;

export interface DragItemType {
  type: DndAcceptType;
  originItem: ItemType;
  index: number;
  originIndex: number;
  from: ContainerType;
  originContainer: ContainerType;
}

export interface PivotTableStylesProps {
  height: number;
  width: number;
}

export type FilterType = Record<string, DataRecordValue>;
export type SelectedFiltersType = Record<string, DataRecordValue[]>;

export type DateFormatter =
  | TimeFormatter
  | NumberFormatter
  | ((value: DataRecordValue) => string);
export enum MetricsLayoutEnum {
  ROWS = 'ROWS',
  COLUMNS = 'COLUMNS',
}

interface PivotTableCustomizeProps {
  groupbyRows: QueryFormColumn[];
  groupbyColumns: QueryFormColumn[];
  availableFields: QueryFormColumn[];
  metrics: QueryFormMetric[];
  availableMetrics: QueryFormMetric[];
  tableRenderer: string;
  colOrder: string;
  rowOrder: string;
  aggregateFunction: string;
  transposePivot: boolean;
  combineMetric: boolean;
  rowSubtotalPosition: boolean;
  colSubtotalPosition: boolean;
  colTotals: boolean;
  colSubTotals: boolean;
  rowTotals: boolean;
  rowSubTotals: boolean;
  valueFormat: string;
  currencyFormat: Currency;
  setDataMask: SetDataMaskHook;
  setControlValue: HandlerFunction;
  emitCrossFilters?: boolean;
  selectedFilters?: SelectedFiltersType;
  verboseMap: JsonObject;
  columnFormats: JsonObject;
  currencyFormats: Record<string, Currency>;
  metricsLayout?: MetricsLayoutEnum;
  metricColorFormatters: ColorFormatters;
  dateFormatters: Record<string, DateFormatter | undefined>;
  legacy_order_by: QueryFormMetric[] | QueryFormMetric | null;
  order_desc: boolean;
  onContextMenu?: (
    clientX: number,
    clientY: number,
    filters?: ContextMenuFilters,
  ) => void;
  timeGrainSqla?: TimeGranularity;
  time_grain_sqla?: TimeGranularity;
  granularity_sqla?: string;
}

export type PivotTableQueryFormData = QueryFormData &
  PivotTableStylesProps &
  PivotTableCustomizeProps;

export type PivotTableProps = PivotTableStylesProps &
  PivotTableCustomizeProps & {
    data: DataRecord[];
  };

export interface TableOptionsProps {
  colTotals: boolean;
  colSubTotals: boolean;
  rowTotals: boolean;
  rowSubTotals: boolean;
  emitCrossFilters?: boolean;
  metricColorFormatters: ColorFormatters;
  dateFormatters: Record<string, DateFormatter | undefined>;
  selectedFilters?: SelectedFiltersType;
  toggleFilter: (
    e: MouseEvent,
    value: string,
    filters: FilterType,
    pivotData: Record<string, any>,
    isSubtotal: boolean,
    isGrandTotal: boolean,
  ) => void;
}

export interface FormattersProps {
  valueFormat: string;
  currencyFormat: Currency;
  columnFormats: JsonObject;
  currencyFormats: Record<string, Currency>;
}

export interface PivotDataProps {
  data: DataRecord[];
  metrics: QueryFormMetric[];
  groupbyRows: QueryFormColumn[];
  groupbyColumns: QueryFormColumn[];
  transposePivot: boolean;
  combineMetric: boolean;
  metricsLayout?: MetricsLayoutEnum;
}

export interface FiltersProps {
  groupbyRows: QueryFormColumn[];
  groupbyColumns: QueryFormColumn[];
  setDataMask: SetDataMaskHook;
  selectedFilters?: SelectedFiltersType;
  emitCrossFilters?: boolean;
  onContextMenu:
    | ((
        clientX: number,
        clientY: number,
        filters?: ContextMenuFilters | undefined,
      ) => void)
    | undefined;
  dateFormatters: Record<string, DateFormatter | undefined>;
  timeGrainSqla?: TimeGranularity;
}

export interface SubtotalOptionsProps {
  colSubtotalPosition: boolean;
  rowSubtotalPosition: boolean;
}

export type LayoutStateProps = {
  columns: ItemType[];
  rows: ItemType[];
  metrics: ItemType[];
  availableFields: ItemType[];
  availableMetrics: ItemType[];
  setControlValue: HandlerFunction;
  setDataMask?: SetDataMaskHook;
};
