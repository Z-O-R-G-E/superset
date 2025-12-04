import { useCallback, MouseEvent } from 'react';
import {
  DataRecordValue,
  isPhysicalColumn,
  isAdhocColumn,
  BinaryQueryObjectFilterClause,
  QueryFormColumn,
  ContextMenuFilters,
  TimeGranularity,
} from '@superset-ui/core';
import { DateFormatter, SelectedFiltersType } from '../types';

export interface HandleContextMenuProps {
  cols: string[];
  rows: string[];
  groupbyRows: QueryFormColumn[];
  groupbyColumns: QueryFormColumn[];
  selectedFilters?: SelectedFiltersType;
  onContextMenu?: (
    clientX: number,
    clientY: number,
    filters?: ContextMenuFilters,
  ) => void;
  dateFormatters: Record<string, DateFormatter | undefined>;
  timeGrainSqla?: TimeGranularity;
}

export type HandleContextMenuType = ReturnType<typeof useHandleContextMenu>;

export const useHandleContextMenu = ({
  cols,
  rows,
  groupbyRows,
  groupbyColumns,
  selectedFilters,
  onContextMenu,
  dateFormatters,
  timeGrainSqla,
}: HandleContextMenuProps) => {
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

  return useCallback(
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
};
