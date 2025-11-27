import { useMemo, MouseEvent } from 'react';
import { FeatureFlag, isFeatureEnabled } from '@superset-ui/core';
import { ColorFormatters } from '@superset-ui/chart-controls';
import { METRIC_KEY } from '../constants';
import { DateFormatter, FilterType, SelectedFiltersType } from '../types';

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

export type TableOptionsType = ReturnType<typeof useTableOptions>;

export const useTableOptions = ({
  colTotals,
  colSubTotals,
  rowTotals,
  rowSubTotals,
  emitCrossFilters,
  metricColorFormatters,
  dateFormatters,
  selectedFilters,
  toggleFilter,
}: TableOptionsProps) =>
  useMemo(
    () => ({
      clickRowHeaderCallback: toggleFilter,
      clickColumnHeaderCallback: toggleFilter,
      colTotals,
      colSubTotals,
      rowTotals,
      rowSubTotals,
      highlightHeaderCellsOnHover:
        emitCrossFilters ||
        isFeatureEnabled(FeatureFlag.DrillBy) ||
        isFeatureEnabled(FeatureFlag.DrillToDetail),
      highlightedHeaderCells: selectedFilters,
      omittedHighlightHeaderGroups: [METRIC_KEY],
      cellColorFormatters: { [METRIC_KEY]: metricColorFormatters },
      dateFormatters,
    }),
    [
      colTotals,
      colSubTotals,
      dateFormatters,
      emitCrossFilters,
      metricColorFormatters,
      rowTotals,
      rowSubTotals,
      selectedFilters,
      toggleFilter,
    ],
  );
