import { useMemo } from 'react';
import {
  AdhocMetric,
  DataRecord,
  getColumnLabel,
  QueryFormColumn,
  QueryFormMetric,
} from '@superset-ui/core';
import { METRIC_KEY } from '../constants';
import { MetricsLayoutEnum } from '../types';
import { sortAs } from '../react-pivottable/utils';

export interface PivotDataProps {
  data: DataRecord[];
  metrics: QueryFormMetric[];
  groupbyRows: QueryFormColumn[];
  groupbyColumns: QueryFormColumn[];
  transposePivot: boolean;
  combineMetric: boolean;
  metricsLayout?: MetricsLayoutEnum;
}

export type UnpivotedDataType = ReturnType<typeof usePivotData>;

export const usePivotData = ({
  data: dataRaw,
  metrics,
  groupbyRows: groupbyRowsRaw,
  groupbyColumns: groupbyColumnsRaw,
  transposePivot,
  combineMetric,
  metricsLayout,
}: PivotDataProps) => {
  const metricNames = useMemo(
    () =>
      metrics.map((metric: string | AdhocMetric) =>
        typeof metric === 'string' ? metric : String(metric.label),
      ),
    [metrics],
  );

  const data = useMemo(
    () =>
      dataRaw.reduce(
        (acc: DataRecord[], record: DataRecord) => [
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
    [dataRaw, metricNames],
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
    data,
    rows,
    cols,
    sorters,
  };
};
