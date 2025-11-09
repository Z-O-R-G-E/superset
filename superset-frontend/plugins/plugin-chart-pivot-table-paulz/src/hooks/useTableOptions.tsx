import { useMemo } from 'react';
import { FeatureFlag, isFeatureEnabled } from '@superset-ui/core';
import { METRIC_KEY } from '../constants';
import { PivotTableProps } from '../types';

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
}: Pick<
  PivotTableProps,
  | 'colTotals'
  | 'colSubTotals'
  | 'rowTotals'
  | 'rowSubTotals'
  | 'emitCrossFilters'
  | 'metricColorFormatters'
  | 'dateFormatters'
  | 'selectedFilters'
> & {
  toggleFilter: any;
}) =>
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
