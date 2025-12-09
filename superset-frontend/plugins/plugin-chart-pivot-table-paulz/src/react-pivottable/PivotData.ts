import {
  CurrencyFormatter,
  DataRecord,
  DataRecordValue,
  NumberFormatter,
  t,
} from '@superset-ui/core';
import { flatKey, getSort, naturalSort } from './utils';
import { FormattersType } from '../hooks/useFormatters';
import { UnpivotedDataType } from '../hooks/usePivotData';
import { aggregatorsFactory } from './utils/aggregatorTemplates';

const VALS = ['value'];

interface PivotProps {
  unpivotedData: UnpivotedDataType;
  formatters: FormattersType;
  aggregatorName: string;
  colOrder: string;
  rowOrder: string;
}

interface Subtotals {
  rowEnabled?: boolean;
  colEnabled?: boolean;
  rowPartialOnTop?: boolean;
  colPartialOnTop?: boolean;
}

export type PivotDataType = ReturnType<typeof createPivotData>;

export const createPivotData = (
  {
    unpivotedData,
    formatters,
    aggregatorName = 'Count',
    colOrder = 'key_a_to_z',
    rowOrder = 'key_a_to_z',
  }: PivotProps,
  { rowEnabled, colEnabled, rowPartialOnTop, colPartialOnTop }: Subtotals,
) => {
  const { data, rows = [], cols = [], sorters = {} } = unpivotedData;
  const { defaultFormatter, metricFormatters } = formatters;

  const aggregator =
    aggregatorsFactory(defaultFormatter)[aggregatorName!]?.(VALS);

  const formatColumns = (
    columnFormatter: Record<string, CurrencyFormatter | NumberFormatter>,
  ) =>
    Object.fromEntries(
      Object.entries(columnFormatter).map(([column, formatter]) => [
        column,
        aggregatorsFactory(formatter)[aggregatorName!]?.(VALS),
      ]),
    );

  const formattedAggregators =
    metricFormatters &&
    Object.fromEntries(
      Object.entries(metricFormatters).map(([key, columnFormatter]) => [
        key,
        formatColumns(columnFormatter),
      ]),
    );

  const tree = {};
  const rowKeys: DataRecordValue[][] = [];
  const colKeys: DataRecordValue[][] = [];
  const rowTotals = {};
  const colTotals = {};
  const allTotal = aggregator({}, [], []);
  let sorted = false;

  const pivotData = {
    rowTotals,
    colTotals,
    tree,
    allTotal,

    getAggregator(rowKey: DataRecordValue[], colKey: DataRecordValue[]) {
      const flatRowKey = flatKey(rowKey);
      const flatColKey = flatKey(colKey);

      return (
        tree?.[flatRowKey]?.[flatColKey] ||
        rowTotals?.[flatRowKey] ||
        colTotals?.[flatColKey] ||
        allTotal
      );
    },
  };

  const getFormattedAggregator = (
    record: Record<string, any>,
    totalsKeys?: any[],
  ) => {
    if (!formattedAggregators) return aggregator;

    const match = Object.entries(record).find(
      ([field, value]) => formattedAggregators[field]?.[value],
    );

    if (!match) return aggregator;

    const [groupName, groupValue] = match;

    if (totalsKeys && !totalsKeys.includes(groupValue)) return aggregator;

    return formattedAggregators[groupName]?.[groupValue] || aggregator;
  };

  const arrSort = (
    attrs: string[],
    partialOnTop?: boolean,
    reverse = false,
  ) => {
    const sortersArr = attrs.map(a => getSort(sorters!, a));
    return (a: any[], b: any[]) => {
      const limit = Math.min(a.length, b.length);
      for (let i = 0; i < limit; i += 1) {
        const sorter = sortersArr[i];
        const comparison = reverse ? sorter(b[i], a[i]) : sorter(a[i], b[i]);
        if (comparison !== 0) return comparison;
      }
      return partialOnTop ? a.length - b.length : b.length - a.length;
    };
  };

  const sortKeys = () => {
    if (sorted) return;
    sorted = true;

    const v = (r: DataRecordValue[], c: DataRecordValue[]) =>
      pivotData.getAggregator(r, c).value();

    switch (rowOrder) {
      case 'key_z_to_a':
        rowKeys.sort(arrSort(rows!, rowPartialOnTop, true));
        break;
      case 'value_a_to_z':
        rowKeys.sort((a, b) => naturalSort(v(a, []), v(b, [])));
        break;
      case 'value_z_to_a':
        rowKeys.sort((a, b) => -naturalSort(v(a, []), v(b, [])));
        break;
      default:
        rowKeys.sort(arrSort(rows!, rowPartialOnTop));
    }

    switch (colOrder) {
      case 'key_z_to_a':
        colKeys.sort(arrSort(cols!, colPartialOnTop, true));
        break;
      case 'value_a_to_z':
        colKeys.sort((a, b) => naturalSort(v([], a), v([], b)));
        break;
      case 'value_z_to_a':
        colKeys.sort((a, b) => -naturalSort(v([], a), v([], b)));
        break;
      default:
        colKeys.sort(arrSort(cols!, colPartialOnTop));
    }
  };

  const getRowKeys = () => {
    sortKeys();
    return rowKeys;
  };

  const getColKeys = () => {
    sortKeys();
    return colKeys;
  };

  const processRecord = (record: DataRecord) => {
    const colKey = cols!.map(col => record[col] ?? 'null');
    const rowKey = rows!.map(row => record[row] ?? 'null');

    allTotal.push(record);

    const rowStart = rowEnabled ? 1 : Math.max(1, rowKey.length);
    const colStart = colEnabled ? 1 : Math.max(1, colKey.length);

    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      const isSubtotal = ri < rowKey.length;
      const rk = rowKey.slice(0, ri);
      const fr = flatKey(rk);

      if (!rowTotals[fr]) {
        rowKeys.push(rk);
        rowTotals[fr] = getFormattedAggregator(record, rowKey)(
          pivotData,
          rk,
          [],
        );
      }

      rowTotals[fr].push(record);
      rowTotals[fr].isSubtotal = isSubtotal;
    }

    for (let ci = colStart; ci <= colKey.length; ci += 1) {
      const isSubtotal = ci < colKey.length;
      const ck = colKey.slice(0, ci);
      const fc = flatKey(ck);

      if (!colTotals[fc]) {
        colKeys.push(ck);
        colTotals[fc] = getFormattedAggregator(record, colKey)(
          pivotData,
          [],
          ck,
        );
      }

      colTotals[fc].push(record);
      colTotals[fc].isSubtotal = isSubtotal;
    }

    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      const isRowSubtotal = ri < rowKey.length;
      const rk = rowKey.slice(0, ri);
      const fr = flatKey(rk);

      if (!tree[fr]) tree[fr] = {};

      for (let ci = colStart; ci <= colKey.length; ci += 1) {
        const isColSubtotal = ci < colKey.length;
        const ck = colKey.slice(0, ci);
        const fc = flatKey(ck);

        if (!tree[fr][fc]) {
          tree[fr][fc] = getFormattedAggregator(record)(pivotData, rk, ck);
        }

        const cell = tree[fr][fc];
        cell.push(record);
        cell.isSubtotal = isRowSubtotal || isColSubtotal;
        cell.isRowSubtotal = isRowSubtotal;
        cell.isColSubtotal = isColSubtotal;
      }
    }
  };

  if (!Array.isArray(data)) {
    throw new Error(t('Unknown input format'));
  }

  data.forEach(processRecord);

  return {
    getAggregator: pivotData.getAggregator,
    getRowKeys,
    getColKeys,
  };
};
