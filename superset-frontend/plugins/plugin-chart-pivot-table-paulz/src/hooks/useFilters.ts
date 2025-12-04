import { useCallback, MouseEvent } from 'react';
import {
  DataRecordValue,
  isPhysicalColumn,
  isAdhocColumn,
  BinaryQueryObjectFilterClause,
  getSelectedText,
  QueryFormColumn,
  SetDataMaskHook,
  ContextMenuFilters,
  TimeGranularity,
} from '@superset-ui/core';
import { DateFormatter, FilterType, SelectedFiltersType } from '../types';
import { METRIC_KEY } from '../constants';

export interface FiltersProps {
  cols: string[];
  rows: string[];
  groupbyRows: QueryFormColumn[];
  groupbyColumns: QueryFormColumn[];
  setDataMask: SetDataMaskHook;
  selectedFilters?: SelectedFiltersType;
  emitCrossFilters?: boolean;
  onContextMenu?: (
    clientX: number,
    clientY: number,
    filters?: ContextMenuFilters,
  ) => void;
  dateFormatters: Record<string, DateFormatter | undefined>;
  timeGrainSqla?: TimeGranularity;
}

export const useFilters = ({
  cols,
  rows,
  groupbyRows,
  groupbyColumns,
  setDataMask,
  selectedFilters,
  emitCrossFilters,
  onContextMenu,
  dateFormatters,
  timeGrainSqla,
}: FiltersProps) => {
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

  const getCrossFilterDataMask = useCallback(
    (value?: { [key: string]: string }) => {
      const isActiveFilterValue = (key: string, val: DataRecordValue) =>
        !!selectedFilters && selectedFilters[key]?.includes(val);

      if (!value) {
        return undefined;
      }

      const [key, val] = Object.entries(value)[0];
      let values = { ...selectedFilters };

      if (isActiveFilterValue(key, val)) {
        values = {};
      } else {
        values = { [key]: [val] };
      }

      const filterKeys = Object.keys(values);

      return {
        dataMask: {
          extraFormData: {
            filters:
              filterKeys.length === 0
                ? undefined
                : filterKeys.map(key => createFilterClause(key, values?.[key])),
          },
          filterState: {
            value:
              values && Object.keys(values).length
                ? Object.values(values)
                : null,
            selectedFilters:
              values && Object.keys(values).length ? values : null,
          },
        },
        isCurrentValueSelected: isActiveFilterValue(key, val),
      };
    },
    [selectedFilters, createFilterClause],
  );

  const toggleFilter = useCallback(
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

  const handleContextMenu = useCallback(
    (
      e: MouseEvent,
      colKey?: any[],
      rowKey?: any[],
      dataPoint?: { [key: string]: string },
    ) => {
      if (onContextMenu) {
        e.preventDefault();
        e.stopPropagation();
        const drillToDetailFilters: BinaryQueryObjectFilterClause[] = [];
        if (colKey && colKey.length > 1) {
          colKey.forEach((val, i) => {
            const col = cols[i];
            const formatter = dateFormatters[col];
            const formattedVal = formatter?.(val as number) || String(val);
            if (i > 0) {
              drillToDetailFilters.push({
                col,
                op: '==',
                val,
                formattedVal,
                grain: formatter ? timeGrainSqla : undefined,
              });
            }
          });
        }
        if (rowKey) {
          rowKey.forEach((val, i) => {
            const col = rows[i];
            const formatter = dateFormatters[col];
            const formattedVal = formatter?.(val as number) || String(val);
            drillToDetailFilters.push({
              col,
              op: '==',
              val,
              formattedVal,
              grain: formatter ? timeGrainSqla : undefined,
            });
          });
        }
        onContextMenu(e.clientX, e.clientY, {
          drillToDetail: drillToDetailFilters,
          crossFilter: getCrossFilterDataMask(dataPoint),
          drillBy: dataPoint && {
            filters: [
              {
                col: Object.keys(dataPoint)[0],
                op: '==',
                val: Object.values(dataPoint)[0],
              },
            ],
            groupbyFieldName: rowKey ? 'groupbyRows' : 'groupbyColumns',
          },
        });
      }
    },
    [
      cols,
      dateFormatters,
      getCrossFilterDataMask,
      onContextMenu,
      rows,
      timeGrainSqla,
    ],
  );

  return {
    handleChange,
    getCrossFilterDataMask,
    toggleFilter,
    handleContextMenu,
  };
};
