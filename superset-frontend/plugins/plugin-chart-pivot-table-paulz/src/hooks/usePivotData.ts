import { useMemo } from 'react';
import { AdhocMetric, getColumnLabel } from '@superset-ui/core';
import { METRIC_KEY } from '../constants';
import { MetricsLayoutEnum, PivotTableProps } from '../types';
import { sortAs } from '../react-pivottable/utilities';

export const usePivotData = ({
  data,
  metrics,
  groupbyRows: groupbyRowsRaw,
  groupbyColumns: groupbyColumnsRaw,
  transposePivot,
  combineMetric,
  metricsLayout,
}: Pick<
  PivotTableProps,
  | 'data'
  | 'metrics'
  | 'groupbyRows'
  | 'groupbyColumns'
  | 'transposePivot'
  | 'combineMetric'
  | 'metricsLayout'
>) => {
  const metricNames = useMemo(
    () =>
      metrics.map((metric: string | AdhocMetric) =>
        typeof metric === 'string' ? metric : (metric.label as string),
      ),
    [metrics],
  );

  const unpivotedData = useMemo(
    () =>
      data.reduce(
        (acc: Record<string, any>[], record: Record<string, any>) => [
          ...acc,
          ...metricNames
            .map((name: string) => ({
              ...record,
              [METRIC_KEY]: name,
              value: record[name],
            }))
            .filter(record => record.value !== null),
        ],
        [],
      ),
    [data, metricNames],
  );

  const groupbyRows = useMemo(
    () => groupbyRowsRaw.map(getColumnLabel),
    [groupbyRowsRaw],
  );

  const groupbyColumns = useMemo(
    () => groupbyColumnsRaw.map(getColumnLabel),
    [groupbyColumnsRaw],
  );

  const sorters = useMemo(
    () => ({
      [METRIC_KEY]: sortAs(metricNames),
    }),
    [metricNames],
  );

  const [rows, cols] = useMemo(() => {
    let [rows_, cols_] = transposePivot
      ? [groupbyColumns, groupbyRows]
      : [groupbyRows, groupbyColumns];

    if (metricsLayout === MetricsLayoutEnum.ROWS) {
      rows_ = combineMetric ? [...rows_, METRIC_KEY] : [METRIC_KEY, ...rows_];
    } else {
      cols_ = combineMetric ? [...cols_, METRIC_KEY] : [METRIC_KEY, ...cols_];
    }
    return [rows_, cols_];
  }, [
    combineMetric,
    groupbyColumns,
    groupbyRows,
    metricsLayout,
    transposePivot,
  ]);

  return {
    unpivotedData,
    rows,
    cols,
    sorters,
    metricNames,
    groupbyRows,
    groupbyColumns,
  };
};
