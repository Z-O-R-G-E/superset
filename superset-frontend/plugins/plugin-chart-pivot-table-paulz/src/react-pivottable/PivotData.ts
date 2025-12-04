import { DataRecord, DataRecordValue, t } from '@superset-ui/core';
import { aggregatorsFactory, flatKey, getSort, naturalSort } from './utils';
import { FormattersType } from '../hooks/useFormatters';
import { UnpivotedDataType } from '../hooks/usePivotData';

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

  const aggregatorFactory = aggregatorsFactory(formatters.defaultFormatter)[
    aggregatorName!
  ];
  const aggregator = aggregatorFactory(VALS);

  const formattedAggregators = formatters.metricFormatters
    ? Object.fromEntries(
        Object.entries(formatters.metricFormatters).map(
          ([key, columnFormatter]) => [
            key,
            Object.fromEntries(
              Object.entries(columnFormatter).map(([column, formatter]) => [
                column,
                aggregatorsFactory(formatter)[aggregatorName!](VALS),
              ]),
            ),
          ],
        ),
      )
    : null;

  const tree = {};
  const rowKeys: DataRecordValue[][] = [];
  const colKeys: DataRecordValue[][] = [];
  const rowTotals = {};
  const colTotals = {};
  const allTotal = aggregator({}, [], []);
  let sorted = false;

  const getAggregator = (rowKey: any[], colKey: any[]) => {
    const flatRowKey = flatKey(rowKey);
    const flatColKey = flatKey(colKey);

    const agg =
      rowKey.length === 0 && colKey.length === 0
        ? allTotal
        : rowKey.length === 0
          ? colTotals[flatColKey]
          : colKey.length === 0
            ? rowTotals[flatRowKey]
            : tree[flatRowKey][flatColKey];

    return (
      agg || {
        push: () => {},
        value: () => null,
        format: () => '',
      }
    );
  };

  const getFormattedAggregator = (
    record: Record<string, any>,
    totalsKeys?: any[],
  ) => {
    if (!formattedAggregators) return aggregator;

    const [groupName, groupValue] =
      Object.entries(record).find(
        ([name, value]) => formattedAggregators[name]?.[value],
      ) || [];

    if (
      !groupName ||
      !groupValue ||
      (totalsKeys && !totalsKeys.includes(groupValue))
    ) {
      return aggregator;
    }
    return formattedAggregators[groupName][groupValue] || aggregator;
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

    const v = (r: any[], c: any[]) => getAggregator(r, c).value();

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
    const colKey = cols!.map(col => (col in record ? record[col] : 'null'));
    const rowKey = rows!.map(row => (row in record ? record[row] : 'null'));

    allTotal.push(record);

    const rowStart = rowEnabled ? 1 : Math.max(1, rowKey.length);
    const colStart = colEnabled ? 1 : Math.max(1, colKey.length);

    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      const isRowSubtotal = ri < rowKey.length;
      const fRowKey = rowKey.slice(0, ri);
      const flatRowKey = flatKey(fRowKey);

      if (!rowTotals[flatRowKey]) {
        rowKeys.push(fRowKey);
        rowTotals[flatRowKey] = getFormattedAggregator(record, rowKey)(
          {},
          fRowKey,
          [],
        );
      }
      rowTotals[flatRowKey].push(record);
      rowTotals[flatRowKey].isSubtotal = isRowSubtotal;
    }

    for (let ci = colStart; ci <= colKey.length; ci += 1) {
      const isColSubtotal = ci < colKey.length;
      const fColKey = colKey.slice(0, ci);
      const flatColKey = flatKey(fColKey);

      if (!colTotals[flatColKey]) {
        colKeys.push(fColKey);
        colTotals[flatColKey] = getFormattedAggregator(record, colKey)(
          {},
          [],
          fColKey,
        );
      }
      colTotals[flatColKey].push(record);
      colTotals[flatColKey].isSubtotal = isColSubtotal;
    }

    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      const isRowSubtotal = ri < rowKey.length;
      const fRowKey = rowKey.slice(0, ri);
      const flatRowKey = flatKey(fRowKey);
      if (!tree[flatRowKey]) tree[flatRowKey] = {};

      for (let ci = colStart; ci <= colKey.length; ci += 1) {
        const isColSubtotal = ci < colKey.length;
        const fColKey = colKey.slice(0, ci);
        const flatColKey = flatKey(fColKey);

        if (!tree[flatRowKey][flatColKey]) {
          tree[flatRowKey][flatColKey] = getFormattedAggregator(record)(
            {},
            fRowKey,
            fColKey,
          );
        }
        tree[flatRowKey][flatColKey].push(record);
        tree[flatRowKey][flatColKey].isRowSubtotal = isRowSubtotal;
        tree[flatRowKey][flatColKey].isColSubtotal = isColSubtotal;
        tree[flatRowKey][flatColKey].isSubtotal =
          isRowSubtotal || isColSubtotal;
      }
    }
  };

  const inputData = Array.isArray(data)
    ? data
    : (() => {
        throw new Error(t('Unknown input format'));
      })();

  inputData.forEach(processRecord);

  return {
    getAggregator,
    getRowKeys,
    getColKeys,
  };
};
