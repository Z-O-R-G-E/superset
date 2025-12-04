import { useCallback, MouseEvent } from 'react';
import {
  DataRecordValue,
  isPhysicalColumn,
  isAdhocColumn,
  getSelectedText,
  QueryFormColumn,
  SetDataMaskHook,
} from '@superset-ui/core';
import { FilterType, SelectedFiltersType } from '../types';
import { METRIC_KEY } from '../constants';

export interface ToggleFilterProps {
  groupbyRows: QueryFormColumn[];
  groupbyColumns: QueryFormColumn[];
  setDataMask: SetDataMaskHook;
  selectedFilters?: SelectedFiltersType;
  emitCrossFilters?: boolean;
}

export type ToggleFilterType = ReturnType<typeof useToggleFilter>;

export const useToggleFilter = ({
  groupbyRows,
  groupbyColumns,
  setDataMask,
  selectedFilters,
  emitCrossFilters,
}: ToggleFilterProps) => {
  const createFilterClause = useCallback(
    (key: string, val: DataRecordValue[]) => {
      const groupby: QueryFormColumn[] = [...groupbyRows, ...groupbyColumns];
      const col =
        groupby.find(item => {
          if (isPhysicalColumn(item)) {
            return item === key;
          }
          if (isAdhocColumn(item)) {
            return item.label === key;
          }
          return false;
        }) ?? '';

      if (val === null || val === undefined) {
        return {
          col,
          op: 'IS NULL' as const,
        };
      }

      return {
        col,
        op: 'IN' as const,
        val: val as (string | number | boolean)[],
      };
    },
    [groupbyColumns, groupbyRows],
  );

  const handleChange = useCallback(
    (filters: SelectedFiltersType) => {
      const filterKeys = Object.keys(filters);

      setDataMask({
        extraFormData: {
          filters:
            filterKeys.length === 0
              ? undefined
              : filterKeys.map(key => createFilterClause(key, filters?.[key])),
        },
        filterState: {
          value:
            filters && Object.keys(filters).length
              ? Object.values(filters)
              : null,
          selectedFilters:
            filters && Object.keys(filters).length ? filters : null,
        },
      });
    },
    [setDataMask, createFilterClause],
  );

  return useCallback(
    (
      e: MouseEvent,
      value: string,
      filters: FilterType,
      pivotData: Record<string, any>,
      isSubtotal: boolean,
      isGrandTotal: boolean,
    ) => {
      if (isSubtotal || isGrandTotal || !emitCrossFilters) {
        return;
      }

      if (getSelectedText()) {
        return;
      }

      const isActiveFilterValue = (key: string, val: DataRecordValue) =>
        !!selectedFilters && selectedFilters[key]?.includes(val);

      const filtersCopy = { ...filters };
      delete filtersCopy[METRIC_KEY];

      const filtersEntries = Object.entries(filtersCopy);
      if (filtersEntries.length === 0) {
        return;
      }

      const [key, val] = filtersEntries[filtersEntries.length - 1];

      let updatedFilters = { ...(selectedFilters || {}) };

      // multi select
      // if (selectedFilters && isActiveFilterValue(key, val)) {
      //   updatedFilters[key] = selectedFilters[key].filter((x: DataRecordValue) => x !== val);
      // } else {
      //   updatedFilters[key] = [...(selectedFilters?.[key] || []), val];
      // }

      // single select
      if (selectedFilters && isActiveFilterValue(key, val)) {
        updatedFilters = {};
      } else {
        updatedFilters = {
          [key]: [val],
        };
      }

      if (
        Array.isArray(updatedFilters[key]) &&
        updatedFilters[key].length === 0
      ) {
        delete updatedFilters[key];
      }

      handleChange(updatedFilters);
    },
    [emitCrossFilters, selectedFilters, handleChange],
  );
};
